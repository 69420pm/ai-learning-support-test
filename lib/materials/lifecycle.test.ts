import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import type { StorageDriver } from '@/lib/storage';
import { LocalStorageDriver, resetStorageDriver } from '@/lib/storage';
import { deleteMaterialLifecycle, deleteProjectLifecycle } from './lifecycle';

// Mock DB queries
const mockGetMaterialById = vi.fn();
const mockDeleteMaterialById = vi.fn();
const mockGetMaterialsByProjectId = vi.fn();

vi.mock('@/lib/db/queries/material', () => ({
  getMaterialById: (...args: unknown[]) => mockGetMaterialById(...args),
  deleteMaterialById: (...args: unknown[]) => mockDeleteMaterialById(...args),
  getMaterialsByProjectId: (...args: unknown[]) => mockGetMaterialsByProjectId(...args),
}));

describe('Material Lifecycle Domain Logic (lib/materials/lifecycle.ts)', () => {
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

    mockGetMaterialById.mockResolvedValue({ ...sampleMaterial });
    mockDeleteMaterialById.mockResolvedValue({ ...sampleMaterial });
    mockGetMaterialsByProjectId.mockResolvedValue([...sampleMaterials]);
  });

  describe('deleteMaterialLifecycle', () => {
    it('verifies existence, deletes DB record, and purges physical storage blob', async () => {
      const result = await deleteMaterialLifecycle(
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

      expect(mockGetMaterialById).toHaveBeenCalledWith({ id: defaultMaterialId });
      expect(mockDeleteMaterialById).toHaveBeenCalledWith({
        id: defaultMaterialId,
        projectId: defaultProjectId,
        userId: defaultUserId,
      });
      expect(mockDeleteBlob).toHaveBeenCalledWith(defaultStoragePath);
    });

    it('validates project scoping when projectId is provided', async () => {
      const result = await deleteMaterialLifecycle(
        {
          materialId: defaultMaterialId,
          projectId: defaultProjectId,
        },
        { storageDriver: mockStorage },
      );

      expect(result.success).toBe(true);
      expect(mockDeleteMaterialById).toHaveBeenCalledWith({
        id: defaultMaterialId,
        projectId: defaultProjectId,
        userId: defaultUserId,
      });
    });

    it('validates user ownership scoping when userId is provided', async () => {
      const result = await deleteMaterialLifecycle(
        {
          materialId: defaultMaterialId,
          userId: defaultUserId,
        },
        { storageDriver: mockStorage },
      );

      expect(result.success).toBe(true);
      expect(mockDeleteMaterialById).toHaveBeenCalledWith({
        id: defaultMaterialId,
        projectId: defaultProjectId,
        userId: defaultUserId,
      });
    });

    it('handles missing physical storage blob gracefully without throwing', async () => {
      mockDeleteBlob.mockRejectedValueOnce(
        new Error('NoSuchKey: The specified key does not exist.'),
      );

      const result = await deleteMaterialLifecycle(
        {
          materialId: defaultMaterialId,
          projectId: defaultProjectId,
          userId: defaultUserId,
        },
        { storageDriver: mockStorage },
      );

      expect(result.success).toBe(true);
      expect(mockDeleteMaterialById).toHaveBeenCalled();
      expect(mockDeleteBlob).toHaveBeenCalledWith(defaultStoragePath);
    });

    it('handles empty storagePath by skipping storage deletion', async () => {
      mockGetMaterialById.mockResolvedValueOnce({
        ...sampleMaterial,
        storagePath: '',
      });

      const result = await deleteMaterialLifecycle(
        {
          materialId: defaultMaterialId,
          projectId: defaultProjectId,
          userId: defaultUserId,
        },
        { storageDriver: mockStorage },
      );

      expect(result.success).toBe(true);
      expect(mockDeleteMaterialById).toHaveBeenCalled();
      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });

    it('throws not_found:document when material does not exist', async () => {
      mockGetMaterialById.mockResolvedValueOnce(null);

      await expect(
        deleteMaterialLifecycle(
          {
            materialId: 'non-existent-id',
            projectId: defaultProjectId,
            userId: defaultUserId,
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      expect(mockDeleteMaterialById).not.toHaveBeenCalled();
      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });

    it('throws forbidden:document when material belongs to another user', async () => {
      await expect(
        deleteMaterialLifecycle(
          {
            materialId: defaultMaterialId,
            projectId: defaultProjectId,
            userId: 'different-user-id',
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      expect(mockDeleteMaterialById).not.toHaveBeenCalled();
      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });

    it('throws not_found:document when material does not belong to specified project', async () => {
      await expect(
        deleteMaterialLifecycle(
          {
            materialId: defaultMaterialId,
            projectId: 'different-project-id',
            userId: defaultUserId,
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      expect(mockDeleteMaterialById).not.toHaveBeenCalled();
      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });

    it('throws bad_request:document when materialId is empty or whitespace', async () => {
      await expect(
        deleteMaterialLifecycle(
          {
            materialId: '   ',
            projectId: defaultProjectId,
            userId: defaultUserId,
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      await expect(
        deleteMaterialLifecycle({} as unknown as { materialId: string }, {
          storageDriver: mockStorage,
        }),
      ).rejects.toThrow(ChatbotError);
    });

    it('deletes physical file from filesystem when using LocalStorageDriver', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lifecycle-test-'));
      try {
        const localDriver = new LocalStorageDriver(tempDir);
        const testStoragePath = `${defaultProjectId}/file-to-delete.pdf`;
        await localDriver.upload(testStoragePath, Buffer.from('test content'), 'application/pdf');

        const localMaterial = {
          ...sampleMaterial,
          storagePath: testStoragePath,
        };
        mockGetMaterialById.mockResolvedValueOnce(localMaterial);

        const result = await deleteMaterialLifecycle(
          {
            materialId: defaultMaterialId,
            projectId: defaultProjectId,
            userId: defaultUserId,
          },
          { storageDriver: localDriver },
        );

        expect(result.success).toBe(true);
        const physicalFilePath = path.join(tempDir, testStoragePath);
        await expect(fs.access(physicalFilePath)).rejects.toThrow();

        // Idempotent: does not throw if file already deleted on disk
        mockGetMaterialById.mockResolvedValueOnce(localMaterial);
        const result2 = await deleteMaterialLifecycle(
          {
            materialId: defaultMaterialId,
            projectId: defaultProjectId,
            userId: defaultUserId,
          },
          { storageDriver: localDriver },
        );
        expect(result2.success).toBe(true);
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('deleteProjectLifecycle', () => {
    it('retrieves materials for project and purges all storage blobs', async () => {
      const result = await deleteProjectLifecycle(
        { projectId: defaultProjectId },
        { storageDriver: mockStorage },
      );

      expect(result).toEqual({
        purgedCount: 3,
        totalMaterials: 3,
      });

      expect(mockGetMaterialsByProjectId).toHaveBeenCalledWith({
        projectId: defaultProjectId,
        userId: undefined,
      });

      expect(mockDeleteBlob).toHaveBeenCalledTimes(3);
      expect(mockDeleteBlob).toHaveBeenCalledWith(`${defaultProjectId}/lecture1.pdf`);
      expect(mockDeleteBlob).toHaveBeenCalledWith(`${defaultProjectId}/lecture2.pdf`);
      expect(mockDeleteBlob).toHaveBeenCalledWith(`${defaultProjectId}/notes.md`);
    });

    it('handles project with no materials gracefully', async () => {
      mockGetMaterialsByProjectId.mockResolvedValueOnce([]);

      const result = await deleteProjectLifecycle(
        { projectId: defaultProjectId },
        { storageDriver: mockStorage },
      );

      expect(result).toEqual({
        purgedCount: 0,
        totalMaterials: 0,
      });

      expect(mockDeleteBlob).not.toHaveBeenCalled();
    });

    it('handles materials without storagePath gracefully', async () => {
      mockGetMaterialsByProjectId.mockResolvedValueOnce([
        { ...sampleMaterials[0], storagePath: '' },
        { ...sampleMaterials[1], storagePath: '   ' },
        { ...sampleMaterials[2], storagePath: `${defaultProjectId}/notes.md` },
      ]);

      const result = await deleteProjectLifecycle(
        { projectId: defaultProjectId },
        { storageDriver: mockStorage },
      );

      expect(result).toEqual({
        purgedCount: 1,
        totalMaterials: 3,
      });

      expect(mockDeleteBlob).toHaveBeenCalledTimes(1);
      expect(mockDeleteBlob).toHaveBeenCalledWith(`${defaultProjectId}/notes.md`);
    });

    it('continues purging remaining files even if one storage deletion fails', async () => {
      mockDeleteBlob
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Storage connection timeout'))
        .mockResolvedValueOnce(undefined);

      const result = await deleteProjectLifecycle(
        { projectId: defaultProjectId },
        { storageDriver: mockStorage },
      );

      expect(result).toEqual({
        purgedCount: 2,
        totalMaterials: 3,
      });

      expect(mockDeleteBlob).toHaveBeenCalledTimes(3);
    });

    it('scopes material retrieval to userId when provided', async () => {
      const result = await deleteProjectLifecycle(
        { projectId: defaultProjectId, userId: defaultUserId },
        { storageDriver: mockStorage },
      );

      expect(result.purgedCount).toBe(3);
      expect(mockGetMaterialsByProjectId).toHaveBeenCalledWith({
        projectId: defaultProjectId,
        userId: defaultUserId,
      });
    });

    it('throws bad_request:document when projectId is missing or whitespace', async () => {
      await expect(
        deleteProjectLifecycle({ projectId: '   ' }, { storageDriver: mockStorage }),
      ).rejects.toThrow(ChatbotError);

      await expect(
        deleteProjectLifecycle({} as unknown as { projectId: string }, {
          storageDriver: mockStorage,
        }),
      ).rejects.toThrow(ChatbotError);
    });

    it('removes all physical project files from disk using LocalStorageDriver', async () => {
      const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'project-purge-test-'));
      try {
        const localDriver = new LocalStorageDriver(tempDir);

        for (const mat of sampleMaterials) {
          await localDriver.upload(
            mat.storagePath,
            Buffer.from(`data for ${mat.filename}`),
            mat.fileType,
          );
        }

        for (const mat of sampleMaterials) {
          const filePath = path.join(tempDir, mat.storagePath);
          await expect(fs.access(filePath)).resolves.toBeUndefined();
        }

        const result = await deleteProjectLifecycle(
          { projectId: defaultProjectId },
          { storageDriver: localDriver },
        );

        expect(result).toEqual({
          purgedCount: 3,
          totalMaterials: 3,
        });

        for (const mat of sampleMaterials) {
          const filePath = path.join(tempDir, mat.storagePath);
          await expect(fs.access(filePath)).rejects.toThrow();
        }
      } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
