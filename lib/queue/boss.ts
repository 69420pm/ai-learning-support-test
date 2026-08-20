import { PgBoss } from 'pg-boss';

export const MATERIAL_INGEST_QUEUE = 'material-ingest';

export type MaterialIngestJobData = {
  materialId: string;
  projectId: string;
  userId: string;
  storagePath: string;
  fileType: string;
};

let bossInstance: PgBoss | null = null;

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
  try {
    const boss = getPgBoss();
    await boss.start();
    await boss.createQueue(MATERIAL_INGEST_QUEUE);
    return boss;
  } catch (error) {
    console.error('Failed to start pg-boss queue:', error);
    return null;
  }
}

export async function stopQueue(): Promise<void> {
  if (bossInstance) {
    try {
      await bossInstance.stop({ graceful: true, timeout: 2000 });
    } catch (error) {
      console.error('Error stopping pg-boss queue:', error);
    } finally {
      bossInstance = null;
    }
  }
}

export async function sendIngestJob(data: MaterialIngestJobData): Promise<string | null> {
  try {
    const boss = getPgBoss();
    // If not started yet, start it
    if (!boss.isMaintaining) {
      await boss.start();
      await boss.createQueue(MATERIAL_INGEST_QUEUE);
    }
    const jobId = await boss.send(MATERIAL_INGEST_QUEUE, data);
    return jobId;
  } catch (error) {
    console.error('Failed to dispatch material ingest job:', error);
    // In test environments or when pg-boss fails, fallback
    return null;
  }
}
