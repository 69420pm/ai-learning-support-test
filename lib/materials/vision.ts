import { generateText, type LanguageModel } from 'ai';
import { MATERIAL_VISION_INGESTION_PROMPT } from '@/lib/ai/prompts';
import { getLanguageModel, type ProviderName } from '@/lib/ai/providers';
import { ChatbotError } from '@/lib/errors';
import type { RasterizedPage } from './rasterizer';

export type VisionExtractionOptions = {
  model?: LanguageModel;
  provider?: ProviderName;
  modelId?: string;
  apiKey?: string;
  prompt?: string;
};

export type VisionExtractionResult = {
  pageNumber: number;
  markdown: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
  };
};

export async function extractMarkdownFromPage(
  page: RasterizedPage,
  options: VisionExtractionOptions = {},
): Promise<VisionExtractionResult> {
  const model =
    options.model ??
    getLanguageModel({
      provider: options.provider,
      modelId: options.modelId,
      apiKey: options.apiKey,
    });

  const prompt = options.prompt ?? MATERIAL_VISION_INGESTION_PROMPT;

  try {
    const result = await generateText({
      model,
      maxRetries: 1,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt,
            },
            {
              type: 'file',
              data: new Uint8Array(page.imageBuffer),
              mediaType: page.mimeType || 'image/png',
            },
          ],
        },
      ],
    });

    return {
      pageNumber: page.pageNumber,
      markdown: result.text.trim(),
      tokenUsage: {
        promptTokens: result.usage?.inputTokens,
        completionTokens: result.usage?.outputTokens,
      },
    };
  } catch (error) {
    if (error instanceof ChatbotError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : 'Vision extraction failed';
    throw new Error(`Vision extraction failed: ${message}`);
  }
}

export type ExtractMarkdownFromPagesOptions = VisionExtractionOptions & {
  concurrency?: number;
  pageDelayMs?: number;
  onProgress?: (
    completedPages: number,
    totalPages: number,
    currentPageNumber: number,
  ) => Promise<void> | void;
};

export async function extractMarkdownFromPages(
  pages: RasterizedPage[],
  options: ExtractMarkdownFromPagesOptions = {},
): Promise<VisionExtractionResult[]> {
  if (pages.length === 0) {
    return [];
  }

  const defaultDelay = process.env.NODE_ENV === 'test' ? 0 : 1000;
  const { concurrency = 1, pageDelayMs = defaultDelay, onProgress, ...extractionOptions } = options;
  const results: VisionExtractionResult[] = new Array(pages.length);
  let completedCount = 0;

  const queue = [...pages.entries()];

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      const [index, page] = item;

      const pageResult = await extractMarkdownFromPage(page, extractionOptions);
      results[index] = pageResult;
      completedCount++;

      if (onProgress) {
        await onProgress(completedCount, pages.length, page.pageNumber);
      }

      if (pageDelayMs > 0 && queue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, pageDelayMs));
      }
    }
  }

  const workerCount = Math.min(concurrency, pages.length);
  const workers = Array.from({ length: workerCount }, () => worker());

  await Promise.all(workers);

  return results.sort((a, b) => a.pageNumber - b.pageNumber);
}
