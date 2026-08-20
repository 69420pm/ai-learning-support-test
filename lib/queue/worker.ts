import type { PgBoss } from 'pg-boss';
import { generateEmbeddings } from '@/lib/ai/embedding';
import { insertMaterialChunks, updateMaterialStatus } from '@/lib/db/queries/material';
import type { NewMaterialChunk } from '@/lib/db/schema';
import { chunkMarkdown, chunkMultimodalPages } from '@/lib/materials/chunker';
import { isMultimodal, rasterizeDocument } from '@/lib/materials/rasterizer';
import { extractMarkdownFromPages } from '@/lib/materials/vision';
import { getStorageDriver } from '@/lib/storage';
import { MATERIAL_INGEST_QUEUE, type MaterialIngestJobData } from './boss';

export type IngestionResult = {
  chunkCount: number;
  tokenCount: number;
  pageCount?: number;
};

export async function processMaterialIngest(data: MaterialIngestJobData): Promise<IngestionResult> {
  const { materialId, projectId, userId, storagePath, fileType } = data;
  let currentStage = 'starting';

  try {
    // 1. Update status to 'processing'
    currentStage = 'downloading';
    await updateMaterialStatus({
      id: materialId,
      status: 'processing',
      metadata: {
        progress: {
          stage: 'starting',
          stagePercent: 5,
          totalPages: 0,
          currentPage: 0,
        },
      },
    });

    // 2. Download from storage
    const storageDriver = getStorageDriver();
    const buffer = await storageDriver.download(storagePath);

    // 3. Multimodal ingestion (PDF, Images, Slides) vs Plain Text
    if (isMultimodal(fileType, storagePath)) {
      currentStage = 'rasterizing';
      await updateMaterialStatus({
        id: materialId,
        status: 'processing',
        metadata: {
          progress: {
            stage: 'rasterizing',
            stagePercent: 15,
            totalPages: 0,
            currentPage: 0,
          },
        },
      });

      const pages = await rasterizeDocument(buffer, fileType, storagePath);

      if (pages.length === 0) {
        await updateMaterialStatus({
          id: materialId,
          status: 'ready',
          metadata: {
            pageCount: 0,
            chunkCount: 0,
            tokenCount: 0,
            progress: {
              stage: 'completed',
              stagePercent: 100,
              totalPages: 0,
              currentPage: 0,
            },
            processedAt: new Date().toISOString(),
          },
        });
        return { chunkCount: 0, tokenCount: 0, pageCount: 0 };
      }

      currentStage = 'extracting_vision';
      await updateMaterialStatus({
        id: materialId,
        status: 'processing',
        metadata: {
          pageCount: pages.length,
          progress: {
            stage: 'extracting_vision',
            stagePercent: 25,
            totalPages: pages.length,
            currentPage: 0,
          },
        },
      });

      const visionResults = await extractMarkdownFromPages(pages, {
        onProgress: async (completed, total, currentPageNumber) => {
          const stagePercent = 25 + Math.floor((completed / total) * 45); // 25% -> 70%
          await updateMaterialStatus({
            id: materialId,
            status: 'processing',
            metadata: {
              pageCount: total,
              progress: {
                stage: 'extracting_vision',
                stagePercent,
                totalPages: total,
                currentPage: currentPageNumber,
                completedPages: completed,
              },
            },
          });
        },
      });

      currentStage = 'chunking';
      await updateMaterialStatus({
        id: materialId,
        status: 'processing',
        metadata: {
          pageCount: pages.length,
          progress: {
            stage: 'chunking',
            stagePercent: 75,
            totalPages: pages.length,
            currentPage: pages.length,
          },
        },
      });

      const chunks = chunkMultimodalPages(visionResults);
      if (chunks.length === 0) {
        await updateMaterialStatus({
          id: materialId,
          status: 'ready',
          metadata: {
            pageCount: pages.length,
            chunkCount: 0,
            tokenCount: 0,
            progress: {
              stage: 'completed',
              stagePercent: 100,
              totalPages: pages.length,
              currentPage: pages.length,
            },
            processedAt: new Date().toISOString(),
          },
        });
        return { chunkCount: 0, tokenCount: 0, pageCount: pages.length };
      }

      currentStage = 'embedding';
      await updateMaterialStatus({
        id: materialId,
        status: 'processing',
        metadata: {
          pageCount: pages.length,
          chunkCount: chunks.length,
          progress: {
            stage: 'embedding',
            stagePercent: 85,
            totalPages: pages.length,
            currentPage: pages.length,
          },
        },
      });

      const contents = chunks.map((c) => c.content);
      const embeddings = await generateEmbeddings(contents);

      currentStage = 'persisting';
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

      await updateMaterialStatus({
        id: materialId,
        status: 'ready',
        metadata: {
          pageCount: pages.length,
          chunkCount: chunks.length,
          tokenCount: totalTokens,
          progress: {
            stage: 'completed',
            stagePercent: 100,
            totalPages: pages.length,
            currentPage: pages.length,
          },
          processedAt: new Date().toISOString(),
        },
      });

      return {
        chunkCount: chunks.length,
        tokenCount: totalTokens,
        pageCount: pages.length,
      };
    }

    // Plain text / Markdown fallback
    currentStage = 'chunking';
    const text = buffer.toString('utf-8');
    const chunks = chunkMarkdown(text, { pageNumber: 1 });

    if (chunks.length === 0) {
      await updateMaterialStatus({
        id: materialId,
        status: 'ready',
        metadata: {
          pageCount: 1,
          chunkCount: 0,
          tokenCount: 0,
          progress: {
            stage: 'completed',
            stagePercent: 100,
          },
          processedAt: new Date().toISOString(),
        },
      });
      return { chunkCount: 0, tokenCount: 0, pageCount: 1 };
    }

    currentStage = 'embedding';
    const contents = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(contents);

    currentStage = 'persisting';
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

    await updateMaterialStatus({
      id: materialId,
      status: 'ready',
      metadata: {
        pageCount: 1,
        chunkCount: chunks.length,
        tokenCount: totalTokens,
        progress: {
          stage: 'completed',
          stagePercent: 100,
        },
        processedAt: new Date().toISOString(),
      },
    });

    return { chunkCount: chunks.length, tokenCount: totalTokens, pageCount: 1 };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Ingestion processing failed';
    console.error(
      `Failed to ingest material ${materialId} at stage "${currentStage}":`,
      errorMessage,
    );

    try {
      await updateMaterialStatus({
        id: materialId,
        status: 'failed',
        errorMessage,
        metadata: {
          error: {
            message: errorMessage,
            stage: currentStage,
            failedAt: new Date().toISOString(),
          },
          progress: {
            stage: 'failed',
            stagePercent: 0,
          },
        },
      });
    } catch (statusError) {
      console.error(`Failed to mark material ${materialId} as failed:`, statusError);
    }

    throw error;
  }
}

export async function registerMaterialIngestWorker(boss: PgBoss): Promise<void> {
  await boss.work<MaterialIngestJobData>(MATERIAL_INGEST_QUEUE, async (jobs) => {
    for (const job of jobs) {
      try {
        await processMaterialIngest(job.data);
      } catch (err) {
        console.error(`Job ${job.id} failed:`, err);
        throw err;
      }
    }
  });
}
