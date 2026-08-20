export type ChunkOptions = {
  minTokens?: number;
  maxTokens?: number;
  targetTokens?: number;
};

export type MaterialChunkResult = {
  content: string;
  tokenCount: number;
  chunkIndex: number;
  metadata: {
    heading?: string;
    sectionIndex?: number;
    charCount: number;
  };
};

export function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  // Standard heuristic: ~4 characters per token or ~1.3 tokens per word
  const charBased = Math.ceil(text.length / 4);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const wordBased = Math.ceil(words * 1.3);
  return Math.max(charBased, wordBased);
}

function splitIntoSemanticBlocks(markdown: string): string[] {
  const normalized = markdown.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];

  const headingRegex = /(?=(?:^|\n)#{1,6}\s+)/g;
  const rawSections = normalized
    .split(headingRegex)
    .map((s) => s.trim())
    .filter(Boolean);

  const blocks: string[] = [];

  for (const section of rawSections) {
    const paragraphs = section
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    for (const para of paragraphs) {
      blocks.push(para);
    }
  }

  return blocks;
}

function splitByCharacters(text: string, maxTokens: number): string[] {
  const maxChars = Math.max(100, maxTokens * 3);
  const chunks: string[] = [];
  let index = 0;
  while (index < text.length) {
    const slice = text.slice(index, index + maxChars);
    chunks.push(slice.trim());
    index += maxChars;
  }
  return chunks.filter(Boolean);
}

function splitByDelimiters(text: string, delimiterRegex: RegExp, maxTokens: number): string[] {
  const segments = text.split(delimiterRegex).filter(Boolean);
  if (segments.length <= 1) {
    return splitByCharacters(text, maxTokens);
  }

  const result: string[] = [];
  let current = '';

  for (const seg of segments) {
    const candidate = current ? `${current} ${seg}` : seg;
    if (estimateTokenCount(candidate) <= maxTokens) {
      current = candidate;
    } else {
      if (current) {
        result.push(current);
      }
      if (estimateTokenCount(seg) <= maxTokens) {
        current = seg;
      } else {
        result.push(...splitByCharacters(seg, maxTokens));
        current = '';
      }
    }
  }

  if (current) {
    result.push(current);
  }

  return result;
}

function splitOversizedBlock(block: string, maxTokens: number): string[] {
  if (estimateTokenCount(block) <= maxTokens) {
    return [block];
  }

  const lines = block
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length > 1) {
    return splitByDelimiters(block, /\n+/, maxTokens);
  }

  return splitByDelimiters(block, /(?<=[.?!])\s+/, maxTokens);
}

function extractHeading(content: string): string | undefined {
  const match = content.match(/^#{1,6}\s+(.+)$/m);
  return match ? match[1].trim() : undefined;
}

export function chunkMarkdown(markdown: string, options: ChunkOptions = {}): MaterialChunkResult[] {
  const { minTokens = 300, maxTokens = 800 } = options;

  const rawBlocks = splitIntoSemanticBlocks(markdown);
  if (rawBlocks.length === 0) {
    return [];
  }

  const atomicBlocks: string[] = [];
  for (const block of rawBlocks) {
    atomicBlocks.push(...splitOversizedBlock(block, maxTokens));
  }

  const chunks: MaterialChunkResult[] = [];
  let currentChunkBlocks: string[] = [];
  let currentTokens = 0;
  let currentHeading: string | undefined;

  for (const block of atomicBlocks) {
    const blockTokens = estimateTokenCount(block);
    const blockHeading = extractHeading(block);

    const wouldExceedMax = currentTokens + blockTokens > maxTokens;
    const isNewSectionBreak = Boolean(blockHeading) && currentTokens >= minTokens;

    if (currentChunkBlocks.length > 0 && (wouldExceedMax || isNewSectionBreak)) {
      const content = currentChunkBlocks.join('\n\n').trim();
      chunks.push({
        content,
        tokenCount: estimateTokenCount(content),
        chunkIndex: chunks.length,
        metadata: {
          heading: currentHeading,
          sectionIndex: chunks.length,
          charCount: content.length,
        },
      });

      currentChunkBlocks = [];
      currentTokens = 0;
      currentHeading = undefined;
    }

    if (!currentHeading && blockHeading) {
      currentHeading = blockHeading;
    }

    currentChunkBlocks.push(block);
    currentTokens += blockTokens;
  }

  if (currentChunkBlocks.length > 0) {
    const content = currentChunkBlocks.join('\n\n').trim();
    chunks.push({
      content,
      tokenCount: estimateTokenCount(content),
      chunkIndex: chunks.length,
      metadata: {
        heading: currentHeading,
        sectionIndex: chunks.length,
        charCount: content.length,
      },
    });
  }

  return chunks;
}
