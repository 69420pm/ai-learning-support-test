import type { PgBoss } from 'pg-boss';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ingestMaterial } from '@/lib/materials';
import { MATERIAL_INGEST_QUEUE, type MaterialIngestJobData } from './boss';
import { processMaterialIngest, registerMaterialIngestWorker } from './worker';

vi.mock('@/lib/materials', () => ({
  ingestMaterial: vi.fn(),
}));

type JobItem = { id: string; data: MaterialIngestJobData };
type WorkHandler = (jobs: JobItem[]) => Promise<void>;

function createMockBoss() {
  let capturedHandler: WorkHandler | null = null;
  const mockBoss = {
    work: vi.fn().mockImplementation((_queue: string, handler: WorkHandler) => {
      capturedHandler = handler;
      return Promise.resolve();
    }),
    getHandler: (): WorkHandler => {
      if (!capturedHandler) {
        throw new Error('Worker handler was not registered');
      }
      return capturedHandler;
    },
  };
  return mockBoss;
}

describe('Material Ingestion Queue Worker Adapter', () => {
  const mockIngestMaterial = vi.mocked(ingestMaterial);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processMaterialIngest', () => {
    it('unwraps job data and delegates directly to ingestMaterial', async () => {
      const jobData: MaterialIngestJobData = {
        materialId: 'mat-123',
        projectId: 'proj-456',
        userId: 'user-789',
        storagePath: 'proj-456/notes.pdf',
        fileType: 'application/pdf',
      };

      const expectedResult = {
        chunkCount: 5,
        tokenCount: 1200,
        pageCount: 3,
      };

      mockIngestMaterial.mockResolvedValueOnce(expectedResult);

      const result = await processMaterialIngest(jobData);

      expect(mockIngestMaterial).toHaveBeenCalledTimes(1);
      expect(mockIngestMaterial).toHaveBeenCalledWith(jobData);
      expect(result).toEqual(expectedResult);
    });

    it('propagates error when ingestMaterial throws', async () => {
      const jobData: MaterialIngestJobData = {
        materialId: 'mat-err',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/err.md',
        fileType: 'text/markdown',
      };

      mockIngestMaterial.mockRejectedValueOnce(new Error('Ingestion processing failed'));

      await expect(processMaterialIngest(jobData)).rejects.toThrow('Ingestion processing failed');
      expect(mockIngestMaterial).toHaveBeenCalledWith(jobData);
    });
  });

  describe('registerMaterialIngestWorker', () => {
    it('registers worker on MATERIAL_INGEST_QUEUE with pg-boss', async () => {
      const mockBoss = createMockBoss();

      await registerMaterialIngestWorker(mockBoss as unknown as PgBoss);

      expect(mockBoss.work).toHaveBeenCalledTimes(1);
      expect(mockBoss.work).toHaveBeenCalledWith(MATERIAL_INGEST_QUEUE, expect.any(Function));
    });

    it('unwraps job payload and delegates execution to ingestMaterial', async () => {
      const mockBoss = createMockBoss();
      await registerMaterialIngestWorker(mockBoss as unknown as PgBoss);

      const jobData: MaterialIngestJobData = {
        materialId: 'mat-job-1',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/slides.pdf',
        fileType: 'application/pdf',
      };

      mockIngestMaterial.mockResolvedValueOnce({
        chunkCount: 2,
        tokenCount: 450,
        pageCount: 2,
      });

      const handler = mockBoss.getHandler();
      await handler([
        {
          id: 'boss-job-1',
          data: jobData,
        },
      ]);

      expect(mockIngestMaterial).toHaveBeenCalledTimes(1);
      expect(mockIngestMaterial).toHaveBeenCalledWith(jobData);
    });

    it('processes multiple jobs in batch sequentially', async () => {
      const mockBoss = createMockBoss();
      await registerMaterialIngestWorker(mockBoss as unknown as PgBoss);

      const job1Data: MaterialIngestJobData = {
        materialId: 'mat-batch-1',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/doc1.txt',
        fileType: 'text/plain',
      };

      const job2Data: MaterialIngestJobData = {
        materialId: 'mat-batch-2',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/doc2.pdf',
        fileType: 'application/pdf',
      };

      mockIngestMaterial.mockResolvedValue({
        chunkCount: 1,
        tokenCount: 100,
        pageCount: 1,
      });

      const handler = mockBoss.getHandler();
      await handler([
        { id: 'job-1', data: job1Data },
        { id: 'job-2', data: job2Data },
      ]);

      expect(mockIngestMaterial).toHaveBeenCalledTimes(2);
      expect(mockIngestMaterial).toHaveBeenNthCalledWith(1, job1Data);
      expect(mockIngestMaterial).toHaveBeenNthCalledWith(2, job2Data);
    });

    it('suppresses execution errors to prevent pg-boss retry cascades and logs failure', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally suppress console error in test output
      });

      const mockBoss = createMockBoss();
      await registerMaterialIngestWorker(mockBoss as unknown as PgBoss);

      const jobData: MaterialIngestJobData = {
        materialId: 'mat-failing',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/bad.pdf',
        fileType: 'application/pdf',
      };

      const failureError = new Error('AI Provider rate limit exceeded');
      mockIngestMaterial.mockRejectedValueOnce(failureError);

      const handler = mockBoss.getHandler();

      // Must resolve without throwing to prevent pg-boss retrying
      await expect(
        handler([
          {
            id: 'job-fail-123',
            data: jobData,
          },
        ]),
      ).resolves.toBeUndefined();

      expect(mockIngestMaterial).toHaveBeenCalledTimes(1);
      expect(mockIngestMaterial).toHaveBeenCalledWith(jobData);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Job job-fail-123 failed:', failureError);

      consoleErrorSpy.mockRestore();
    });

    it('continues processing subsequent jobs in batch when one job fails, without throwing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Intentionally suppress console error in test output
      });

      const mockBoss = createMockBoss();
      await registerMaterialIngestWorker(mockBoss as unknown as PgBoss);

      const failingJobData: MaterialIngestJobData = {
        materialId: 'mat-fail-batch',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/bad.pdf',
        fileType: 'application/pdf',
      };

      const succeedingJobData: MaterialIngestJobData = {
        materialId: 'mat-success-batch',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/good.txt',
        fileType: 'text/plain',
      };

      const failureError = new Error('Corrupted PDF header');
      mockIngestMaterial
        .mockRejectedValueOnce(failureError)
        .mockResolvedValueOnce({ chunkCount: 1, tokenCount: 50, pageCount: 1 });

      const handler = mockBoss.getHandler();
      await expect(
        handler([
          { id: 'job-err', data: failingJobData },
          { id: 'job-ok', data: succeedingJobData },
        ]),
      ).resolves.toBeUndefined();

      expect(mockIngestMaterial).toHaveBeenCalledTimes(2);
      expect(mockIngestMaterial).toHaveBeenNthCalledWith(1, failingJobData);
      expect(mockIngestMaterial).toHaveBeenNthCalledWith(2, succeedingJobData);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Job job-err failed:', failureError);

      consoleErrorSpy.mockRestore();
    });
  });
});
