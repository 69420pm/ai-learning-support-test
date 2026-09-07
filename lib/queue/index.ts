import { startQueue } from './boss';
import { registerConceptGraphExtractWorker } from './jobs/graph-extraction';
import { registerMaterialIngestWorker } from './worker';

export * from './boss';
export * from './jobs/graph-extraction';
export * from './worker';

let isInitialized = false;

export async function initQueueWorker(): Promise<void> {
  if (isInitialized) {
    return;
  }

  const boss = await startQueue();
  if (boss) {
    await registerMaterialIngestWorker(boss);
    await registerConceptGraphExtractWorker(boss);
    isInitialized = true;
  }
}
