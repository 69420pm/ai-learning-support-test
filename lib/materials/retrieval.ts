import { type GetEmbeddingModelOptions, generateEmbeddings } from '@/lib/ai/embedding';
import { type MaterialChunkSearchResult, searchMaterialChunks } from '@/lib/db/queries/material';

export const DEFAULT_MAX_OUTPUT_CHARS = 8000;

export type RetrievedMaterialChunk = {
  id: string;
  materialId: string;
  projectId: string;
  materialTitle: string;
  filename: string;
  fileType: string;
  pageNumber: number;
  chunkIndex: number;
  similarity: number;
  content: string;
};

export type SearchMaterialsResult = {
  query: string;
  results: RetrievedMaterialChunk[];
  totalResults: number;
};

export type RetrieveMaterialsOptions = {
  projectId: string;
  query: string;
  limit?: number;
  threshold?: number;
  maxOutputChars?: number;
  embeddingOptions?: GetEmbeddingModelOptions;
};

/**
 * Extracts a 1-based page number from chunk metadata, falling back to chunkIndex + 1.
 */
function extractPageNumber(
  metadata: Record<string, unknown> | null | undefined,
  chunkIndex: number,
): number {
  if (
    metadata &&
    typeof metadata === 'object' &&
    typeof metadata.pageNumber === 'number' &&
    Number.isFinite(metadata.pageNumber) &&
    metadata.pageNumber > 0
  ) {
    return Math.floor(metadata.pageNumber);
  }

  return chunkIndex + 1;
}

/**
 * Formats similarity scores by rounding to 4 decimal places.
 */
function formatSimilarity(similarity: number): number {
  if (!Number.isFinite(similarity)) {
    return 0;
  }
  return Number(similarity.toFixed(4));
}

/**
 * Enforces the character budget across ranked chunks, preserving whole chunks
 * where possible and truncating the last partially fitting chunk.
 */
function applyOutputBudget(
  chunks: RetrievedMaterialChunk[],
  maxOutputChars: number,
): RetrievedMaterialChunk[] {
  const budget =
    typeof maxOutputChars === 'number' && maxOutputChars >= 0
      ? maxOutputChars
      : DEFAULT_MAX_OUTPUT_CHARS;

  if (budget === 0) {
    return [];
  }

  let currentChars = 0;
  const budgeted: RetrievedMaterialChunk[] = [];

  for (const chunk of chunks) {
    const remainingBudget = budget - currentChars;
    if (remainingBudget <= 0) {
      break;
    }

    if (chunk.content.length <= remainingBudget) {
      budgeted.push(chunk);
      currentChars += chunk.content.length;
    } else {
      budgeted.push({
        ...chunk,
        content: chunk.content.slice(0, remainingBudget),
      });
      currentChars += remainingBudget;
      break;
    }
  }

  return budgeted;
}

/**
 * Formats raw database search results into standard RetrievedMaterialChunk objects.
 */
function formatRetrievedChunks(rawChunks: MaterialChunkSearchResult[]): RetrievedMaterialChunk[] {
  return rawChunks.map((chunk) => ({
    id: chunk.id,
    materialId: chunk.materialId,
    projectId: chunk.projectId,
    materialTitle: chunk.materialTitle,
    filename: chunk.filename,
    fileType: chunk.fileType,
    pageNumber: extractPageNumber(chunk.metadata, chunk.chunkIndex),
    chunkIndex: chunk.chunkIndex,
    similarity: formatSimilarity(chunk.similarity),
    content: chunk.content,
  }));
}

/**
 * Deep Material Retrieval Pipeline.
 * Serves as the single seam for document-grounded semantic search, handling:
 * 1. Query embedding generation (with BYOK credential passthrough)
 * 2. Vector similarity lookup via pgvector
 * 3. Page metadata extraction and similarity score formatting
 * 4. Character output budget enforcement across ranked chunks
 */
export async function retrieveMaterials(
  options: RetrieveMaterialsOptions,
): Promise<SearchMaterialsResult> {
  const {
    projectId,
    query,
    limit,
    threshold,
    maxOutputChars = DEFAULT_MAX_OUTPUT_CHARS,
    embeddingOptions,
  } = options;

  const trimmedProjectId = projectId?.trim();
  const trimmedQuery = query?.trim();

  if (!trimmedProjectId || !trimmedQuery) {
    return {
      query: query ?? '',
      results: [],
      totalResults: 0,
    };
  }

  // 1. Generate query embedding
  const embeddings = await generateEmbeddings([trimmedQuery], embeddingOptions);
  if (!embeddings || embeddings.length === 0 || !embeddings[0] || embeddings[0].length === 0) {
    return {
      query,
      results: [],
      totalResults: 0,
    };
  }

  // 2. Query pgvector store
  const rawResults = await searchMaterialChunks({
    projectId: trimmedProjectId,
    embedding: embeddings[0],
    limit,
    threshold,
  });

  if (!rawResults || rawResults.length === 0) {
    return {
      query,
      results: [],
      totalResults: 0,
    };
  }

  // 3. Format page numbers & similarity scores
  const formatted = formatRetrievedChunks(rawResults);

  // 4. Enforce output character budget
  const budgetedResults = applyOutputBudget(formatted, maxOutputChars);

  return {
    query,
    results: budgetedResults,
    totalResults: rawResults.length,
  };
}
