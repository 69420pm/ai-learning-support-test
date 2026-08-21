import type { LanguageModel } from 'ai';
import { generateEmbeddings } from '@/lib/ai/embedding';
import { insertMaterialChunks, updateMaterialStatus } from '@/lib/db/queries/material';
import type { NewMaterialChunk } from '@/lib/db/schema';
import { getStorageDriver, type StorageDriver } from '@/lib/storage';
import { chunkMultimodalPages } from './chunker';
import { isMultimodal, rasterizeDocument } from './rasterizer';
import { extractMarkdownFromPages } from './vision';

export type MaterialProgress = {
  stage:
    | 'downloading'
    | 'rasterizing'
    | 'extracting_vision'
    | 'chunking'
    | 'embedding'
    | 'persisting'
    | 'completed'
    | 'failed';
  stagePercent: number;
  totalPages?: number;
  currentPage?: number;
  completedPages?: number;
};

export type IngestMaterialInput = {
  materialId: string;
  projectId: string;
  userId: string;
  storagePath: string;
  fileType: string;
};

export type IngestMaterialOptions = {
  storageDriver?: StorageDriver;
  model?: LanguageModel;
  onProgress?: (progress: MaterialProgress) => Promise<void> | void;
  concurrency?: number;
  pageDelayMs?: number;
};

export type IngestMaterialResult = {
  chunkCount: number;
  tokenCount: number;
  pageCount: number;
};

export type PageMarkdownDescriptor = {
  pageNumber: number;
  markdown: string;
};

type ProgressReporter = (
  stage: MaterialProgress['stage'],
  stagePercent: number,
  progressDetails?: {
    totalPages?: number;
    currentPage?: number;
    completedPages?: number;
  },
  extraMetadata?: Record<string, unknown>,
) => Promise<void>;

async function markCompleted(
  materialId: string,
  result: IngestMaterialResult,
  onProgress?: (progress: MaterialProgress) => Promise<void> | void,
): Promise<IngestMaterialResult> {
  const completedProgress: MaterialProgress = {
    stage: 'completed',
    stagePercent: 100,
    totalPages: result.pageCount,
    currentPage: result.pageCount,
    completedPages: result.pageCount,
  };

  if (onProgress) {
    await onProgress(completedProgress);
  }

  await updateMaterialStatus({
    id: materialId,
    status: 'ready',
    metadata: {
      pageCount: result.pageCount,
      chunkCount: result.chunkCount,
      tokenCount: result.tokenCount,
      progress: completedProgress,
      processedAt: new Date().toISOString(),
    },
  });

  return result;
}

async function extractDocumentPages(
  input: IngestMaterialInput,
  buffer: Buffer,
  options: IngestMaterialOptions | undefined,
  reportProgress: ProgressReporter,
): Promise<{ pages: PageMarkdownDescriptor[]; pageCount: number }> {
  const { storagePath, fileType } = input;

  if (isMultimodal(fileType, storagePath)) {
    await reportProgress('rasterizing', 15, {
      totalPages: 0,
      currentPage: 0,
      completedPages: 0,
    });

    const rasterizedPages = await rasterizeDocument(buffer, fileType, storagePath, {
      onProgress: async (completed, total, currentPageNumber) => {
        const stagePercent = 15 + Math.floor((completed / Math.max(1, total)) * 10);
        await reportProgress(
          'rasterizing',
          stagePercent,
          {
            totalPages: total,
            currentPage: currentPageNumber,
            completedPages: completed,
          },
          { pageCount: total },
        );
      },
    });

    if (rasterizedPages.length === 0) {
      return { pages: [], pageCount: 0 };
    }

    await reportProgress(
      'extracting_vision',
      25,
      {
        totalPages: rasterizedPages.length,
        currentPage: 0,
        completedPages: 0,
      },
      { pageCount: rasterizedPages.length },
    );

    const visionResults = await extractMarkdownFromPages(rasterizedPages, {
      model: options?.model,
      concurrency: options?.concurrency,
      pageDelayMs: options?.pageDelayMs,
      onProgress: async (completed, total, currentPageNumber) => {
        const stagePercent = 25 + Math.floor((completed / Math.max(1, total)) * 45);
        await reportProgress(
          'extracting_vision',
          stagePercent,
          {
            totalPages: total,
            currentPage: currentPageNumber,
            completedPages: completed,
          },
          { pageCount: total },
        );
      },
    });

    return {
      pages: visionResults.map((r) => ({
        pageNumber: r.pageNumber,
        markdown: r.markdown,
      })),
      pageCount: rasterizedPages.length,
    };
  }

  // Plain text / Markdown document normalized to a single page descriptor
  const text = buffer.toString('utf-8');
  return {
    pages: [{ pageNumber: 1, markdown: text }],
    pageCount: 1,
  };
}

async function handleFailure(
  materialId: string,
  stage: MaterialProgress['stage'],
  error: unknown,
  onProgress?: (progress: MaterialProgress) => Promise<void> | void,
): Promise<never> {
  const errorMessage = error instanceof Error ? error.message : 'Ingestion processing failed';
  console.error(`Failed to ingest material ${materialId} at stage "${stage}":`, errorMessage);

  const failureProgress: MaterialProgress = {
    stage: 'failed',
    stagePercent: 0,
  };

  if (onProgress) {
    try {
      await onProgress(failureProgress);
    } catch (cbError) {
      console.error(`onProgress callback error for material ${materialId}:`, cbError);
    }
  }

  try {
    await updateMaterialStatus({
      id: materialId,
      status: 'failed',
      errorMessage,
      metadata: {
        error: {
          message: errorMessage,
          stage,
          failedAt: new Date().toISOString(),
        },
        progress: failureProgress,
      },
    });
  } catch (statusError) {
    console.error(`Failed to mark material ${materialId} as failed:`, statusError);
  }

  throw error;
}

export async function ingestMaterial(
  input: IngestMaterialInput,
  options?: IngestMaterialOptions,
): Promise<IngestMaterialResult> {
  const { materialId, projectId, userId, storagePath, fileType } = input;
  let currentStage: MaterialProgress['stage'] = 'downloading';

  const reportProgress: ProgressReporter = async (
    stage,
    stagePercent,
    progressDetails,
    extraMetadata,
  ) => {
    currentStage = stage;
    const progress: MaterialProgress = {
      stage,
      stagePercent,
      ...progressDetails,
    };

    if (options?.onProgress) {
      await options.onProgress(progress);
    }

    await updateMaterialStatus({
      id: materialId,
      status: 'processing',
      metadata: {
        ...extraMetadata,
        progress,
      },
    });
  };

  try {
    // 1. Download document from storage driver
    await reportProgress('downloading', 10, { totalPages: 0, currentPage: 0 });
    const storageDriver = options?.storageDriver ?? getStorageDriver();
    const buffer = await storageDriver.download(storagePath);

    // 2. Extract & normalize document pages into PageMarkdownDescriptor array
    const isMulti = isMultimodal(fileType, storagePath);
    const { pages, pageCount } = await extractDocumentPages(input, buffer, options, reportProgress);

    if (pageCount === 0) {
      return await markCompleted(
        materialId,
        { chunkCount: 0, tokenCount: 0, pageCount: 0 },
        options?.onProgress,
      );
    }

    // 3. Semantic Chunking (preserving page attribution)
    const chunkingPercent = isMulti ? 75 : 30;
    await reportProgress(
      'chunking',
      chunkingPercent,
      {
        totalPages: pageCount,
        currentPage: pageCount,
        completedPages: isMulti ? pageCount : 0,
      },
      { pageCount },
    );

    const chunks = chunkMultimodalPages(pages);
    if (chunks.length === 0) {
      return await markCompleted(
        materialId,
        { chunkCount: 0, tokenCount: 0, pageCount },
        options?.onProgress,
      );
    }

    // 4. Dense 768-dimensional Vector Embeddings
    const embeddingPercent = isMulti ? 85 : 60;
    await reportProgress(
      'embedding',
      embeddingPercent,
      {
        totalPages: pageCount,
        currentPage: pageCount,
        completedPages: isMulti ? pageCount : 1,
      },
      { pageCount, chunkCount: chunks.length },
    );

    const contents = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(contents);

    // 5. Database Persistence
    const persistingPercent = isMulti ? 95 : 85;
    await reportProgress(
      'persisting',
      persistingPercent,
      {
        totalPages: pageCount,
        currentPage: pageCount,
        completedPages: isMulti ? pageCount : 1,
      },
      { pageCount, chunkCount: chunks.length },
    );

    const totalTokens = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
    const dbChunks: NewMaterialChunk[] = chunks.map((c, i) => ({
      materialId,
      projectId,
      userId,
      chunkIndex: c.chunkIndex,
      content: c.content,
      tokenCount: c.tokenCount,
      embedding: embeddings[i] || null,
      metadata: {
        ...c.metadata,
        pageNumber: c.metadata.pageNumber ?? 1,
      },
    }));

    await insertMaterialChunks(dbChunks);

    // 6. Complete Ingestion & Record Summary Metadata
    return await markCompleted(
      materialId,
      {
        chunkCount: chunks.length,
        tokenCount: totalTokens,
        pageCount,
      },
      options?.onProgress,
    );
  } catch (error: unknown) {
    return await handleFailure(materialId, currentStage, error, options?.onProgress);
  }
}
