import { startQueue } from './boss';
import { registerMaterialIngestWorker } from './worker';

export * from './boss';
export * from './worker';

let isInitialized = false;

export async function initQueueWorker(): Promise<void> {
  if (isInitialized) {
    return;
  }

  const boss = await startQueue();
  if (boss) {
    await registerMaterialIngestWorker(boss);
    isInitialized = true;
  }
}
