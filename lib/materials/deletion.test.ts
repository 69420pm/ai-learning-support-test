import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import type { StorageDriver } from '@/lib/storage';
import { LocalStorageDriver, resetStorageDriver } from '@/lib/storage';
import { deleteMaterial } from './deletion';

// Mock DB queries
const mockGetMaterialById = vi.fn();
const mockDeleteMaterialById = vi.fn();

vi.mock('@/lib/db/queries/material', () => ({
  getMaterialById: (...args: unknown[]) => mockGetMaterialById(...args),
  deleteMaterialById: (...args: unknown[]) => mockDeleteMaterialById(...args),
}));

describe('Material Deletion Domain Logic', () => {
  const defaultProjectId = '11111111-1111-1111-1111-111111111111';
  const defaultUserId = '22222222-2222-2222-2222-222222222222';
  const defaultMaterialId = '33333333-3333-3333-3333-333333333333';
  const defaultStoragePath = `${defaultProjectId}/uuid-notes.pdf`;

  const sampleMaterial = {
    id: defaultMaterialId,
    projectId: defaultProjectId,
    userId: defaultUserId,
    title: 'Lecture Notes',
    filename: 'notes.pdf',
    fileType: 'application/pdf',
    fileSize: 1024,
    storagePath: defaultStoragePath,
    status: 'ready' as const,
    errorMessage: null,
    metadata: { pageCount: 5, chunkCount: 10 },
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:05:00.000Z'),
  };

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

    mockGetMaterialById.mockResolvedValue({ ...sampleMaterial });
    mockDeleteMaterialById.mockResolvedValue({ ...sampleMaterial });
  });

  describe('Successful Material Deletion Flow', () => {
    it('verifies existence, deletes DB record, and purges physical storage blob', async () => {
      const result = await deleteMaterial(
        {
          materialId: defaultMaterialId,
          projectId: defaultProjectId,
          userId: defaultUserId,
        },
        { storageDriver: mockStorage },
      );

      expect(result).toEqual({
        success: true,
        materialId: defaultMaterialId,
        material: expect.objectContaining({
          id: defaultMaterialId,
          title: 'Lecture Notes',
        }),
      });

      // 1. Verify existence check
      expect(mockGetMaterialById).toHaveBeenCalledWith({ id: defaultMaterialId });

      // 2. Verify database deletion
      expect(mockDeleteMaterialById).toHaveBeenCalledWith({
        id: defaultMaterialId,
        projectId: defaultProjectId,
        userId: defaultUserId,
      });

      // 3. Verify storage driver blob removal
      expect(mockDeleteBlob).toHaveBeenCalledWith(defaultStoragePath);
    });

    it('allows deleting material without specifying optional projectId or userId', async () => {
      const result = await deleteMaterial(
        {
          materialId: defaultMaterialId,
        },
        { storageDriver: mockStorage },
      );

      expect(result.success).toBe(true);
      expect(mockGetMaterialById).toHaveBeenCalledWith({ id: defaultMaterialId });
      expect(mockDeleteMaterialById).toHaveBeenCalledWith({
        id: defaultMaterialId,
        projectId: defaultProjectId,
        userId: defaultUserId,
      });
      expect(mockDeleteBlob).toHaveBeenCalledWith(defaultStoragePath);
    });
  });

  describe('Non-Fatal Storage Error Handling', () => {
    it('logs non-fatal error and completes cleanly when storage driver throws', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
        // Suppress error output in test
      });
      mockDeleteBlob.mockRejectedValueOnce(new Error('ENOENT: storage file missing on disk'));

      const result = await deleteMaterial(
        {
          materialId: defaultMaterialId,
          projectId: defaultProjectId,
          userId: defaultUserId,
        },
        { storageDriver: mockStorage },
      );

      expect(result.success).toBe(true);
      expect(result.materialId).toBe(defaultMaterialId);
      expect(mockDeleteMaterialById).toHaveBeenCalledTimes(1);
      expect(mockDeleteBlob).toHaveBeenCalledWith(defaultStoragePath);

      // Warning/error logged
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete physical storage blob'),
        expect.any(Error),
      );

      errorSpy.mockRestore();
    });

    it('does not invoke storage driver if material has empty storagePath', async () => {
      mockGetMaterialById.mockResolvedValueOnce({
        ...sampleMaterial,
        storagePath: '',
      });
      mockDeleteMaterialById.mockResolvedValueOnce({
        ...sampleMaterial,
        storagePath: '',
      });

      const result = await deleteMaterial(
        {
          materialId: defaultMaterialId,
          projectId: defaultProjectId,
          userId: defaultUserId,
        },
        { storageDriver: mockStorage },
      );

      expect(result.success).toBe(true);
      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });
  });

  describe('Not Found & Ownership Validation', () => {
    it('throws not_found ChatbotError when material does not exist', async () => {
      mockGetMaterialById.mockResolvedValue(null);

      await expect(
        deleteMaterial(
          {
            materialId: 'non-existent-id',
            projectId: defaultProjectId,
            userId: defaultUserId,
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      try {
        await deleteMaterial(
          {
            materialId: 'non-existent-id',
          },
          { storageDriver: mockStorage },
        );
      } catch (err) {
        expect(err).toBeInstanceOf(ChatbotError);
        expect((err as ChatbotError).type).toBe('not_found');
        expect((err as ChatbotError).surface).toBe('document');
      }

      expect(mockDeleteMaterialById).not.toHaveBeenCalled();
      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });

    it('throws forbidden ChatbotError when material belongs to another user', async () => {
      mockGetMaterialById.mockResolvedValue({
        ...sampleMaterial,
        userId: 'other-user-uuid',
      });

      await expect(
        deleteMaterial(
          {
            materialId: defaultMaterialId,
            projectId: defaultProjectId,
            userId: defaultUserId,
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      try {
        await deleteMaterial(
          {
            materialId: defaultMaterialId,
            projectId: defaultProjectId,
            userId: defaultUserId,
          },
          { storageDriver: mockStorage },
        );
      } catch (err) {
        expect(err).toBeInstanceOf(ChatbotError);
        expect((err as ChatbotError).type).toBe('forbidden');
        expect((err as ChatbotError).surface).toBe('document');
      }

      expect(mockDeleteMaterialById).not.toHaveBeenCalled();
      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });

    it('throws not_found ChatbotError when material belongs to another project', async () => {
      mockGetMaterialById.mockResolvedValue({
        ...sampleMaterial,
        projectId: 'other-project-uuid',
      });

      await expect(
        deleteMaterial(
          {
            materialId: defaultMaterialId,
            projectId: defaultProjectId,
            userId: defaultUserId,
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      try {
        await deleteMaterial(
          {
            materialId: defaultMaterialId,
            projectId: defaultProjectId,
            userId: defaultUserId,
          },
          { storageDriver: mockStorage },
        );
      } catch (err) {
        expect(err).toBeInstanceOf(ChatbotError);
        expect((err as ChatbotError).type).toBe('not_found');
        expect((err as ChatbotError).surface).toBe('document');
      }

      expect(mockDeleteMaterialById).not.toHaveBeenCalled();
      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });
  });

  describe('Input Validation Constraints', () => {
    it('throws bad_request ChatbotError when materialId is missing or empty', async () => {
      await expect(
        deleteMaterial(
          {
            materialId: '   ',
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      await expect(
        deleteMaterial({} as unknown as { materialId: string }, { storageDriver: mockStorage }),
      ).rejects.toThrow(ChatbotError);

      expect(mockGetMaterialById).not.toHaveBeenCalled();
      expect(mockDeleteMaterialById).not.toHaveBeenCalled();
      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });
  });

  describe('In-Process Integration with LocalStorageDriver', () => {
    it('physically deletes file on disk and tolerates subsequent deletion gracefully', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-storage-delete-'));
      const localDriver = new LocalStorageDriver(tempDir);

      try {
        // Upload a real file
        const uploadResult = await localDriver.upload(
          'proj-1/real-file.txt',
          'Hello real storage',
          'text/plain',
        );
        const fullDiskPath = path.join(tempDir, 'proj-1', 'real-file.txt');
        expect(await fs.stat(fullDiskPath)).toBeDefined();

        mockGetMaterialById.mockResolvedValueOnce({
          ...sampleMaterial,
          storagePath: uploadResult.path,
        });
        mockDeleteMaterialById.mockResolvedValueOnce({
          ...sampleMaterial,
          storagePath: uploadResult.path,
        });

        // Delete using deleteMaterial
        const result = await deleteMaterial(
          {
            materialId: defaultMaterialId,
            projectId: defaultProjectId,
            userId: defaultUserId,
          },
          { storageDriver: localDriver },
        );

        expect(result.success).toBe(true);
        // Verify file is physically removed
        await expect(fs.stat(fullDiskPath)).rejects.toThrow();

        // Second deletion when file is already gone (tolerates ENOENT)
        mockGetMaterialById.mockResolvedValueOnce({
          ...sampleMaterial,
          storagePath: uploadResult.path,
        });
        mockDeleteMaterialById.mockResolvedValueOnce({
          ...sampleMaterial,
          storagePath: uploadResult.path,
        });

        const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {
          // Suppress error output in test
        });
        const result2 = await deleteMaterial(
          {
            materialId: defaultMaterialId,
          },
          { storageDriver: localDriver },
        );

        expect(result2.success).toBe(true);
        errorSpy.mockRestore();
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
