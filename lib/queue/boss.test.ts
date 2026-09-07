import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getPgBoss, MATERIAL_INGEST_QUEUE, sendIngestJob, startQueue, stopQueue } from './boss';

const mockStart = vi.fn();
const mockStop = vi.fn();
const mockCreateQueue = vi.fn();
const mockSend = vi.fn();

vi.mock('pg-boss', () => {
  return {
    // biome-ignore lint/style/useNamingConvention: PgBoss class name export
    PgBoss: class MockPgBoss {
      start = mockStart;
      stop = mockStop;
      createQueue = mockCreateQueue;
      send = mockSend;
    },
  };
});

describe('pg-boss queue lifecycle', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await stopQueue();
  });

  it('creates and returns a singleton PgBoss instance', () => {
    const boss1 = getPgBoss();
    const boss2 = getPgBoss();
    expect(boss1).toBe(boss2);
  });

  it('starts queue and creates material ingest queue on startQueue()', async () => {
    mockStart.mockResolvedValueOnce(undefined);
    mockCreateQueue.mockResolvedValueOnce(undefined);

    const boss = await startQueue();
    expect(boss).not.toBeNull();
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockCreateQueue).toHaveBeenCalledWith(MATERIAL_INGEST_QUEUE);

    // Subsequent calls return the same promise without restarting
    const boss2 = await startQueue();
    expect(boss2).toBe(boss);
    expect(mockStart).toHaveBeenCalledTimes(1);
  });

  it('stops queue and resets singleton on stopQueue()', async () => {
    mockStart.mockResolvedValueOnce(undefined);
    mockCreateQueue.mockResolvedValueOnce(undefined);
    mockStop.mockResolvedValueOnce(undefined);

    await startQueue();
    await stopQueue();

    expect(mockStop).toHaveBeenCalledWith({ graceful: true, timeout: 2000 });

    // Next getPgBoss should create a new instance
    mockStart.mockResolvedValueOnce(undefined);
    mockCreateQueue.mockResolvedValueOnce(undefined);
    await startQueue();
    expect(mockStart).toHaveBeenCalledTimes(2);
  });

  it('sendIngestJob initializes queue if not started and dispatches job', async () => {
    mockStart.mockResolvedValueOnce(undefined);
    mockCreateQueue.mockResolvedValueOnce(undefined);
    mockSend.mockResolvedValueOnce('job-123');

    const jobId = await sendIngestJob({
      materialId: 'mat-1',
      projectId: 'proj-1',
      userId: 'user-1',
      storagePath: 'proj-1/doc.pdf',
      fileType: 'application/pdf',
    });

    expect(jobId).toBe('job-123');
    expect(mockStart).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      MATERIAL_INGEST_QUEUE,
      {
        materialId: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/doc.pdf',
        fileType: 'application/pdf',
      },
      { retryLimit: 0 },
    );
  });

  it('sendIngestJob returns null gracefully on error', async () => {
    mockStart.mockRejectedValueOnce(new Error('Connection refused'));

    const jobId = await sendIngestJob({
      materialId: 'mat-1',
      projectId: 'proj-1',
      userId: 'user-1',
      storagePath: 'proj-1/doc.pdf',
      fileType: 'application/pdf',
    });

    expect(jobId).toBeNull();
  });

  it('sendConceptGraphExtractJob dispatches with singletonKey, retryLimit: 2, retryDelay: 15, and retryBackoff: true', async () => {
    mockStart.mockResolvedValueOnce(undefined);
    mockCreateQueue.mockResolvedValue(undefined);
    mockSend.mockResolvedValueOnce('extract-job-999');

    const { CONCEPT_GRAPH_EXTRACT_QUEUE, sendConceptGraphExtractJob } = await import('./boss');

    const jobId = await sendConceptGraphExtractJob({
      projectId: 'proj-123',
      userId: 'user-456',
      materialIds: ['mat-789'],
    });

    expect(jobId).toBe('extract-job-999');
    expect(mockCreateQueue).toHaveBeenCalledWith(CONCEPT_GRAPH_EXTRACT_QUEUE);
    expect(mockSend).toHaveBeenCalledWith(
      CONCEPT_GRAPH_EXTRACT_QUEUE,
      {
        projectId: 'proj-123',
        userId: 'user-456',
        materialIds: ['mat-789'],
      },
      {
        singletonKey: 'project:proj-123',
        retryLimit: 2,
        retryDelay: 15,
        retryBackoff: true,
      },
    );
  });

  it('sendConceptGraphExtractJob returns null when debounced by singletonKey', async () => {
    mockStart.mockResolvedValueOnce(undefined);
    mockCreateQueue.mockResolvedValue(undefined);
    // pg-boss returns null when a job with matching singletonKey is active/queued
    mockSend.mockResolvedValueOnce(null);

    const { sendConceptGraphExtractJob } = await import('./boss');

    const jobId = await sendConceptGraphExtractJob({
      projectId: 'proj-duplicate',
      userId: 'user-456',
      materialIds: ['mat-1'],
    });

    expect(jobId).toBeNull();
  });
});
