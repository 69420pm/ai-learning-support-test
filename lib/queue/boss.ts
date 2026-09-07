import { PgBoss } from 'pg-boss';

export const MATERIAL_INGEST_QUEUE = 'material-ingest';
export const CONCEPT_GRAPH_EXTRACT_QUEUE = 'concept-graph-extract';

export type MaterialIngestJobData = {
  materialId: string;
  projectId: string;
  userId: string;
  storagePath: string;
  fileType: string;
};

export type ConceptGraphExtractJobData = {
  projectId: string;
  userId: string;
  materialIds: string[];
};

let bossInstance: PgBoss | null = null;
let startPromise: Promise<PgBoss | null> | null = null;

export function getPgBoss(): PgBoss {
  if (bossInstance) {
    return bossInstance;
  }

  const connectionString =
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/ai_learning_support';

  bossInstance = new PgBoss({
    connectionString,
    schema: 'pgboss',
    // biome-ignore lint/style/useNamingConvention: pg-boss constructor property
    application_name: 'ai-learning-support-queue',
    max: 10,
  });

  return bossInstance;
}

export async function startQueue(): Promise<PgBoss | null> {
  if (startPromise) {
    return await startPromise;
  }

  const boss = getPgBoss();

  startPromise = (async () => {
    await boss.start();
    await boss.createQueue(MATERIAL_INGEST_QUEUE);
    await boss.createQueue(CONCEPT_GRAPH_EXTRACT_QUEUE);
    return boss;
  })().catch((error) => {
    console.error('Failed to start pg-boss queue:', error);
    startPromise = null;
    return null;
  });

  return await startPromise;
}

export async function stopQueue(): Promise<void> {
  if (bossInstance) {
    try {
      await bossInstance.stop({ graceful: true, timeout: 2000 });
    } catch (error) {
      console.error('Error stopping pg-boss queue:', error);
    } finally {
      bossInstance = null;
      startPromise = null;
    }
  }
}

export async function sendIngestJob(data: MaterialIngestJobData): Promise<string | null> {
  try {
    const boss = await startQueue();
    if (!boss) {
      throw new Error('pg-boss queue is not available');
    }
    const jobId = await boss.send(MATERIAL_INGEST_QUEUE, data, {
      retryLimit: 0,
    });
    return jobId;
  } catch (error) {
    console.error('Failed to dispatch material ingest job:', error);
    // In test environments or when pg-boss fails, fallback
    return null;
  }
}

export async function sendConceptGraphExtractJob(
  data: ConceptGraphExtractJobData,
): Promise<string | null> {
  try {
    const boss = await startQueue();
    if (!boss) {
      throw new Error('pg-boss queue is not available');
    }
    const jobId = await boss.send(CONCEPT_GRAPH_EXTRACT_QUEUE, data, {
      singletonKey: `project:${data.projectId}`,
      retryLimit: 2,
      retryDelay: 15,
      retryBackoff: true,
    });
    return jobId;
  } catch (error) {
    console.error('Failed to dispatch concept graph extract job:', error);
    return null;
  }
}
