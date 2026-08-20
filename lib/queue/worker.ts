import type { PgBoss } from 'pg-boss';
import { generateEmbeddings } from '@/lib/ai/embedding';
import { insertMaterialChunks, updateMaterialStatus } from '@/lib/db/queries/material';
import type { NewMaterialChunk } from '@/lib/db/schema';
import { chunkMarkdown } from '@/lib/materials/chunker';
import { getStorageDriver } from '@/lib/storage';
import { MATERIAL_INGEST_QUEUE, type MaterialIngestJobData } from './boss';

export async function processMaterialIngest(data: MaterialIngestJobData): Promise<{
  chunkCount: number;
  tokenCount: number;
}> {
  const { materialId, projectId, userId, storagePath } = data;

  try {
    // 1. Update status to 'processing'
    await updateMaterialStatus({ id: materialId, status: 'processing' });

    // 2. Download from storage
    const storageDriver = getStorageDriver();
    const buffer = await storageDriver.download(storagePath);
    const text = buffer.toString('utf-8');

    // 3. Chunk text
    const chunks = chunkMarkdown(text);
    if (chunks.length === 0) {
      await updateMaterialStatus({
        id: materialId,
        status: 'ready',
        metadata: { chunkCount: 0, tokenCount: 0 },
      });
      return { chunkCount: 0, tokenCount: 0 };
    }

    // 4. Generate 768d embeddings
    const contents = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(contents);

    // 5. Insert chunks into material_chunks table
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

    // 6. Update status to 'ready'
    await updateMaterialStatus({
      id: materialId,
      status: 'ready',
      metadata: {
        chunkCount: chunks.length,
        tokenCount: totalTokens,
        processedAt: new Date().toISOString(),
      },
    });

    return { chunkCount: chunks.length, tokenCount: totalTokens };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Ingestion processing failed';
    console.error(`Failed to ingest material ${materialId}:`, errorMessage);

    try {
      await updateMaterialStatus({
        id: materialId,
        status: 'failed',
        errorMessage,
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
