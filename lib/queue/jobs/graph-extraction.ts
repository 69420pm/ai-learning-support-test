import type { PgBoss } from 'pg-boss';
import {
  type ExtractConceptGraphOptions,
  extractConceptGraph,
} from '@/lib/materials/concept-extraction';
import { CONCEPT_GRAPH_EXTRACT_QUEUE, type ConceptGraphExtractJobData } from '@/lib/queue/boss';

export type ProcessGraphExtractionOptions = ExtractConceptGraphOptions;

export type ProcessGraphExtractionResult = {
  processedCount: number;
  kcCount: number;
  exerciseCount: number;
};

/**
 * Queue worker adapter delegating background extraction jobs to the deep extractConceptGraph domain seam.
 */
export async function processGraphExtraction(
  data: ConceptGraphExtractJobData,
  options: ProcessGraphExtractionOptions = {},
): Promise<ProcessGraphExtractionResult> {
  const { projectId, userId, materialIds } = data;

  let totalKcCount = 0;
  let totalExerciseCount = 0;

  for (const materialId of materialIds) {
    const counts = await extractConceptGraph(materialId, {
      projectId,
      userId,
      ...options,
    });
    totalKcCount += counts.kcCount;
    totalExerciseCount += counts.exerciseCount;
  }

  return {
    processedCount: materialIds.length,
    kcCount: totalKcCount,
    exerciseCount: totalExerciseCount,
  };
}

function getJobRetryInfo(job: unknown): { retryCount: number; isFinalAttempt: boolean } {
  const jobRecord = job as Record<string, unknown>;
  const retryCount =
    typeof jobRecord.retryCount === 'number'
      ? jobRecord.retryCount
      : typeof jobRecord.retrycount === 'number'
        ? jobRecord.retrycount
        : 0;
  const retryLimit =
    typeof jobRecord.retryLimit === 'number'
      ? jobRecord.retryLimit
      : typeof jobRecord.retrylimit === 'number'
        ? jobRecord.retrylimit
        : 2;
  return { retryCount, isFinalAttempt: retryCount >= retryLimit };
}

async function handleWorkerJob(job: {
  id: string;
  data: ConceptGraphExtractJobData;
}): Promise<void> {
  const { retryCount, isFinalAttempt } = getJobRetryInfo(job);
  try {
    await processGraphExtraction(job.data, { isFinalAttempt });
  } catch (err) {
    console.error(`Job ${job.id} failed (attempt ${retryCount + 1}):`, err);
    throw err;
  }
}

export async function registerConceptGraphExtractWorker(boss: PgBoss): Promise<void> {
  await boss.work<ConceptGraphExtractJobData>(CONCEPT_GRAPH_EXTRACT_QUEUE, async (jobs) => {
    const jobList = Array.isArray(jobs) ? jobs : [jobs];
    for (const job of jobList) {
      await handleWorkerJob(job);
    }
  });
}
