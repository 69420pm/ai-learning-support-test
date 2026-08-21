import type { PgBoss } from 'pg-boss';
import { type IngestMaterialResult, ingestMaterial } from '@/lib/materials';
import { MATERIAL_INGEST_QUEUE, type MaterialIngestJobData } from './boss';

export type IngestionResult = IngestMaterialResult;

export async function processMaterialIngest(data: MaterialIngestJobData): Promise<IngestionResult> {
  return await ingestMaterial(data);
}

export async function registerMaterialIngestWorker(boss: PgBoss): Promise<void> {
  await boss.work<MaterialIngestJobData>(MATERIAL_INGEST_QUEUE, async (jobs) => {
    for (const job of jobs) {
      try {
        await processMaterialIngest(job.data);
      } catch (err) {
        console.error(`Job ${job.id} failed:`, err);
        // Do not re-throw: status is already persisted as 'failed' in DB,
        // preventing cascading retry storms from consuming API quotas.
      }
    }
  });
}
