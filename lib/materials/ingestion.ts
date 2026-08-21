import type { LanguageModel } from 'ai';
import { generateEmbeddings } from '@/lib/ai/embedding';
import { insertMaterialChunks, updateMaterialStatus } from '@/lib/db/queries/material';
import type { NewMaterialChunk } from '@/lib/db/schema';
import { getStorageDriver, type StorageDriver } from '@/lib/storage';
import { chunkMarkdown, chunkMultimodalPages } from './chunker';
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

async function processMultimodalMaterial(
  input: IngestMaterialInput,
  buffer: Buffer,
  options: IngestMaterialOptions | undefined,
  reportProgress: ProgressReporter,
): Promise<IngestMaterialResult> {
  const { materialId, projectId, userId, storagePath, fileType } = input;

  await reportProgress('rasterizing', 15, {
    totalPages: 0,
    currentPage: 0,
    completedPages: 0,
  });

  const pages = await rasterizeDocument(buffer, fileType, storagePath, {
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

  if (pages.length === 0) {
    return await markCompleted(
      materialId,
      { chunkCount: 0, tokenCount: 0, pageCount: 0 },
      options?.onProgress,
    );
  }

  await reportProgress(
    'extracting_vision',
    25,
    {
      totalPages: pages.length,
      currentPage: 0,
      completedPages: 0,
    },
    { pageCount: pages.length },
  );

  const visionResults = await extractMarkdownFromPages(pages, {
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

  await reportProgress(
    'chunking',
    75,
    {
      totalPages: pages.length,
      currentPage: pages.length,
      completedPages: pages.length,
    },
    { pageCount: pages.length },
  );

  const chunks = chunkMultimodalPages(visionResults);
  if (chunks.length === 0) {
    return await markCompleted(
      materialId,
      { chunkCount: 0, tokenCount: 0, pageCount: pages.length },
      options?.onProgress,
    );
  }

  await reportProgress(
    'embedding',
    85,
    {
      totalPages: pages.length,
      currentPage: pages.length,
      completedPages: pages.length,
    },
    { pageCount: pages.length, chunkCount: chunks.length },
  );

  const contents = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(contents);

  await reportProgress(
    'persisting',
    95,
    {
      totalPages: pages.length,
      currentPage: pages.length,
      completedPages: pages.length,
    },
    { pageCount: pages.length, chunkCount: chunks.length },
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
    metadata: c.metadata,
  }));

  await insertMaterialChunks(dbChunks);

  return await markCompleted(
    materialId,
    {
      chunkCount: chunks.length,
      tokenCount: totalTokens,
      pageCount: pages.length,
    },
    options?.onProgress,
  );
}

async function processTextMaterial(
  input: IngestMaterialInput,
  buffer: Buffer,
  options: IngestMaterialOptions | undefined,
  reportProgress: ProgressReporter,
): Promise<IngestMaterialResult> {
  const { materialId, projectId, userId } = input;

  await reportProgress(
    'chunking',
    30,
    { totalPages: 1, currentPage: 1, completedPages: 0 },
    { pageCount: 1 },
  );

  const text = buffer.toString('utf-8');
  const chunks = chunkMarkdown(text, { pageNumber: 1 });

  if (chunks.length === 0) {
    return await markCompleted(
      materialId,
      { chunkCount: 0, tokenCount: 0, pageCount: 1 },
      options?.onProgress,
    );
  }

  await reportProgress(
    'embedding',
    60,
    { totalPages: 1, currentPage: 1, completedPages: 1 },
    { pageCount: 1, chunkCount: chunks.length },
  );

  const contents = chunks.map((c) => c.content);
  const embeddings = await generateEmbeddings(contents);

  await reportProgress(
    'persisting',
    85,
    { totalPages: 1, currentPage: 1, completedPages: 1 },
    { pageCount: 1, chunkCount: chunks.length },
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

  return await markCompleted(
    materialId,
    {
      chunkCount: chunks.length,
      tokenCount: totalTokens,
      pageCount: 1,
    },
    options?.onProgress,
  );
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
  const { materialId, storagePath, fileType } = input;
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
    await reportProgress('downloading', 10, { totalPages: 0, currentPage: 0 });
    const storageDriver = options?.storageDriver ?? getStorageDriver();
    const buffer = await storageDriver.download(storagePath);

    if (isMultimodal(fileType, storagePath)) {
      return await processMultimodalMaterial(input, buffer, options, reportProgress);
    }

    return await processTextMaterial(input, buffer, options, reportProgress);
  } catch (error: unknown) {
    return await handleFailure(materialId, currentStage, error, options?.onProgress);
  }
}
