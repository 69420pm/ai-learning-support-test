import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import type { StorageDriver } from '@/lib/storage';
import { LocalStorageDriver, resetStorageDriver } from '@/lib/storage';
import { purgeProjectMaterialsStorage } from './purge';

// Mock DB queries
const mockGetMaterialsByProjectId = vi.fn();

vi.mock('@/lib/db/queries/material', () => ({
  getMaterialsByProjectId: (...args: unknown[]) => mockGetMaterialsByProjectId(...args),
}));

describe('Project Materials Storage Purge Domain Logic', () => {
  const defaultProjectId = '11111111-1111-1111-1111-111111111111';
  const defaultUserId = '22222222-2222-2222-2222-222222222222';

  const sampleMaterials = [
    {
      id: 'mat-1',
      projectId: defaultProjectId,
      userId: defaultUserId,
      title: 'Lecture 1',
      filename: 'lecture1.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      storagePath: `${defaultProjectId}/lecture1.pdf`,
      status: 'ready' as const,
      errorMessage: null,
      metadata: {},
      createdAt: new Date('2026-08-20T10:00:00.000Z'),
      updatedAt: new Date('2026-08-20T10:05:00.000Z'),
    },
    {
      id: 'mat-2',
      projectId: defaultProjectId,
      userId: defaultUserId,
      title: 'Lecture 2',
      filename: 'lecture2.pdf',
      fileType: 'application/pdf',
      fileSize: 2048,
      storagePath: `${defaultProjectId}/lecture2.pdf`,
      status: 'ready' as const,
      errorMessage: null,
      metadata: {},
      createdAt: new Date('2026-08-20T11:00:00.000Z'),
      updatedAt: new Date('2026-08-20T11:05:00.000Z'),
    },
    {
      id: 'mat-3',
      projectId: defaultProjectId,
      userId: defaultUserId,
      title: 'Notes',
      filename: 'notes.md',
      fileType: 'text/markdown',
      fileSize: 512,
      storagePath: `${defaultProjectId}/notes.md`,
      status: 'ready' as const,
      errorMessage: null,
      metadata: {},
      createdAt: new Date('2026-08-20T12:00:00.000Z'),
      updatedAt: new Date('2026-08-20T12:05:00.000Z'),
    },
  ];

  let mockDeleteBlob: ReturnType<typeof vi.fn>;
  let mockStorage: StorageDriver;

  beforeEach(() => {
    vi.clearAllMocks();
    resetStorageDriver();

    mockDeleteBlob = vi.fn().mockResolvedValue(undefined);
    mockStorage = {
      upload: vi.fn(),
      download: vi.fn(),
      delete: mockDeleteBlob,
    } as unknown as StorageDriver;

    mockGetMaterialsByProjectId.mockResolvedValue([...sampleMaterials]);
  });

  describe('Successful Multi-File Purging Flow', () => {
    it('retrieves materials and deletes all physical storage blobs', async () => {
      const result = await purgeProjectMaterialsStorage(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
        },
        { storageDriver: mockStorage },
      );

      expect(result).toEqual({
        purgedCount: 3,
        totalMaterials: 3,
      });

      expect(mockGetMaterialsByProjectId).toHaveBeenCalledWith({
        projectId: defaultProjectId,
        userId: defaultUserId,
      });

      expect(mockDeleteBlob).toHaveBeenCalledTimes(3);
      expect(mockDeleteBlob).toHaveBeenCalledWith(`${defaultProjectId}/lecture1.pdf`);
      expect(mockDeleteBlob).toHaveBeenCalledWith(`${defaultProjectId}/lecture2.pdf`);
      expect(mockDeleteBlob).toHaveBeenCalledWith(`${defaultProjectId}/notes.md`);
    });

    it('works when userId is omitted (project-level purge)', async () => {
      const result = await purgeProjectMaterialsStorage(
        {
          projectId: defaultProjectId,
        },
        { storageDriver: mockStorage },
      );

      expect(result.purgedCount).toBe(3);
      expect(mockGetMaterialsByProjectId).toHaveBeenCalledWith({
        projectId: defaultProjectId,
        userId: undefined,
      });
      expect(mockDeleteBlob).toHaveBeenCalledTimes(3);
    });

    it('returns purgedCount: 0 when project has no materials', async () => {
      mockGetMaterialsByProjectId.mockResolvedValueOnce([]);

      const result = await purgeProjectMaterialsStorage(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
        },
        { storageDriver: mockStorage },
      );

      expect(result).toEqual({
        purgedCount: 0,
        totalMaterials: 0,
      });
      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });

    it('skips materials with empty or missing storagePath', async () => {
      mockGetMaterialsByProjectId.mockResolvedValueOnce([
        { ...sampleMaterials[0], storagePath: '' },
        { ...sampleMaterials[1], storagePath: '   ' },
        { ...sampleMaterials[2], storagePath: `${defaultProjectId}/notes.md` },
      ]);

      const result = await purgeProjectMaterialsStorage(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
        },
        { storageDriver: mockStorage },
      );

      expect(result).toEqual({
        purgedCount: 1,
        totalMaterials: 3,
      });
      expect(mockDeleteBlob).toHaveBeenCalledTimes(1);
      expect(mockDeleteBlob).toHaveBeenCalledWith(`${defaultProjectId}/notes.md`);
    });
  });

  describe('Non-Fatal Error Handling & Fault Tolerance', () => {
    it('continues deleting remaining files and logs warnings when individual storage deletions fail', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Suppress console warning in test output
      });

      // Fail the 2nd file, succeed for 1st and 3rd
      mockDeleteBlob.mockImplementation((filePath: string) => {
        if (filePath.includes('lecture2.pdf')) {
          return Promise.reject(new Error('Blob not found on storage remote'));
        }
        return Promise.resolve();
      });

      const result = await purgeProjectMaterialsStorage(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
        },
        { storageDriver: mockStorage },
      );

      expect(result).toEqual({
        purgedCount: 2,
        totalMaterials: 3,
      });

      expect(mockDeleteBlob).toHaveBeenCalledTimes(3);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to purge physical storage blob'),
        expect.any(Error),
      );

      warnSpy.mockRestore();
    });

    it('tolerates when all storage deletions throw errors', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // Suppress console warning in test output
      });

      mockDeleteBlob.mockRejectedValue(new Error('Storage service unavailable'));

      const result = await purgeProjectMaterialsStorage(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
        },
        { storageDriver: mockStorage },
      );

      expect(result).toEqual({
        purgedCount: 0,
        totalMaterials: 3,
      });

      expect(mockDeleteBlob).toHaveBeenCalledTimes(3);
      expect(warnSpy).toHaveBeenCalledTimes(3);

      warnSpy.mockRestore();
    });
  });

  describe('Input Validation Constraints', () => {
    it('throws bad_request ChatbotError when projectId is missing or empty', async () => {
      await expect(
        purgeProjectMaterialsStorage(
          {
            projectId: '   ',
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      await expect(
        purgeProjectMaterialsStorage({} as unknown as { projectId: string }, {
          storageDriver: mockStorage,
        }),
      ).rejects.toThrow(ChatbotError);

      expect(mockGetMaterialsByProjectId).not.toHaveBeenCalled();
      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });
  });

  describe('In-Process Integration with LocalStorageDriver', () => {
    it('physically purges all project files from disk and tolerates missing files', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-storage-purge-'));
      const localDriver = new LocalStorageDriver(tempDir);

      try {
        // 1. Create real files on disk
        const path1 = `${defaultProjectId}/file1.txt`;
        const path2 = `${defaultProjectId}/file2.txt`;
        const path3 = `${defaultProjectId}/file3.txt`;

        await localDriver.upload(path1, 'Content 1', 'text/plain');
        await localDriver.upload(path2, 'Content 2', 'text/plain');
        // Note: intentionally do NOT upload file3 on disk to test missing file tolerance

        mockGetMaterialsByProjectId.mockResolvedValueOnce([
          { ...sampleMaterials[0], storagePath: path1 },
          { ...sampleMaterials[1], storagePath: path2 },
          { ...sampleMaterials[2], storagePath: path3 },
        ]);

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
          // Suppress warning output in test
        });

        // 2. Purge project materials storage
        const result = await purgeProjectMaterialsStorage(
          {
            projectId: defaultProjectId,
            userId: defaultUserId,
          },
          { storageDriver: localDriver },
        );

        // path1 and path2 exist and are deleted (succeed).
        expect(result.totalMaterials).toBe(3);

        // Verify files are no longer on disk
        const fullDiskPath1 = path.join(tempDir, path1);
        const fullDiskPath2 = path.join(tempDir, path2);
        await expect(fs.stat(fullDiskPath1)).rejects.toThrow();
        await expect(fs.stat(fullDiskPath2)).rejects.toThrow();

        warnSpy.mockRestore();
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
