export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    if (process.env.DISABLE_QUEUE_WORKER !== 'true' && process.env.NODE_ENV !== 'test') {
      try {
        const { initQueueWorker } = await import('@/lib/queue');
        await initQueueWorker();
      } catch (error) {
        console.error('Failed to initialize background queue worker:', error);
      }
    }
  }
}
