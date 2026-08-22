import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import {
  createMaterial,
  deleteMaterialById,
  deleteMaterialChunksByMaterialId,
  getMaterialById,
  getMaterialChunksByMaterialId,
  getMaterialsByProjectId,
  insertMaterialChunks,
  searchMaterialChunks,
  updateMaterialStatus,
} from './material';

const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('Material DB Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMaterial', () => {
    it('creates and returns a new material record with pending status', async () => {
      const mockMaterial = {
        id: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
        title: 'Notes',
        filename: 'notes.md',
        fileType: 'text/markdown',
        fileSize: 1024,
        storagePath: 'proj-1/notes.md',
        status: 'pending',
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([mockMaterial]),
        }),
      });

      const result = await createMaterial({
        projectId: 'proj-1',
        userId: 'user-1',
        title: 'Notes',
        filename: 'notes.md',
        fileType: 'text/markdown',
        fileSize: 1024,
        storagePath: 'proj-1/notes.md',
      });

      expect(result).toEqual(mockMaterial);
    });

    it('throws ChatbotError on DB insert failure', async () => {
      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockRejectedValueOnce(new Error('Insert error')),
        }),
      });

      await expect(
        createMaterial({
          projectId: 'proj-1',
          userId: 'user-1',
          title: 'Notes',
          filename: 'notes.md',
          fileType: 'text/markdown',
          storagePath: 'proj-1/notes.md',
        }),
      ).rejects.toThrow(ChatbotError);
    });
  });

  describe('getMaterialsByProjectId', () => {
    it('returns materials ordered by createdAt desc', async () => {
      const mockMaterials = [
        {
          id: 'mat-1',
          projectId: 'proj-1',
          userId: 'user-1',
          title: 'Notes',
          createdAt: new Date(),
        },
      ];

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockResolvedValueOnce(mockMaterials),
          }),
        }),
      });

      const result = await getMaterialsByProjectId({
        projectId: 'proj-1',
        userId: 'user-1',
      });
      expect(result).toEqual(mockMaterials);
    });

    it('returns materials when userId is omitted', async () => {
      const mockMaterials = [
        {
          id: 'mat-1',
          projectId: 'proj-1',
          userId: 'user-1',
          title: 'Notes',
          createdAt: new Date(),
        },
      ];

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockResolvedValueOnce(mockMaterials),
          }),
        }),
      });

      const result = await getMaterialsByProjectId({
        projectId: 'proj-1',
      });
      expect(result).toEqual(mockMaterials);
    });
  });

  describe('getMaterialById', () => {
    it('returns a material by id', async () => {
      const mockMaterial = {
        id: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
        title: 'Notes',
      };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockMaterial]),
        }),
      });

      const result = await getMaterialById({
        id: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
      });
      expect(result).toEqual(mockMaterial);
    });

    it('returns null if material not found', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const result = await getMaterialById({ id: 'non-existent' });
      expect(result).toBeNull();
    });
  });

  describe('updateMaterialStatus', () => {
    it('updates status and returns updated material', async () => {
      const updatedMaterial = {
        id: 'mat-1',
        status: 'ready',
        errorMessage: null,
        updatedAt: new Date(),
      };

      mockUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([updatedMaterial]),
          }),
        }),
      });

      const result = await updateMaterialStatus({
        id: 'mat-1',
        status: 'ready',
      });

      expect(result).toEqual(updatedMaterial);
    });

    it('throws ChatbotError if material to update is not found', async () => {
      mockUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      await expect(
        updateMaterialStatus({
          id: 'non-existent',
          status: 'ready',
        }),
      ).rejects.toThrow(ChatbotError);
    });
  });

  describe('deleteMaterialById', () => {
    it('deletes and returns the deleted material', async () => {
      const deletedMaterial = {
        id: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
      };

      mockDelete.mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([deletedMaterial]),
        }),
      });

      const result = await deleteMaterialById({
        id: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
      });
      expect(result).toEqual(deletedMaterial);
    });
  });

  describe('insertMaterialChunks & getMaterialChunksByMaterialId', () => {
    it('inserts chunks and returns them', async () => {
      const mockChunks = [
        {
          id: 'chunk-1',
          materialId: 'mat-1',
          projectId: 'proj-1',
          userId: 'user-1',
          chunkIndex: 0,
          content: 'Hello chunk',
          tokenCount: 2,
          embedding: [0.1, 0.2] as number[],
          metadata: {},
          createdAt: new Date(),
        },
      ];

      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce(mockChunks),
        }),
      });

      const result = await insertMaterialChunks(mockChunks);
      expect(result).toEqual(mockChunks);
    });

    it('returns empty array when inserting 0 chunks', async () => {
      const result = await insertMaterialChunks([]);
      expect(result).toEqual([]);
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('gets chunks by material id ordered by chunkIndex', async () => {
      const mockChunks = [
        { id: 'c1', chunkIndex: 0 },
        { id: 'c2', chunkIndex: 1 },
      ];

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockResolvedValueOnce(mockChunks),
          }),
        }),
      });

      const result = await getMaterialChunksByMaterialId({ materialId: 'mat-1' });
      expect(result).toEqual(mockChunks);
    });

    it('deletes chunks by materialId', async () => {
      mockDelete.mockReturnValueOnce({
        where: vi.fn().mockResolvedValueOnce(undefined),
      });

      await deleteMaterialChunksByMaterialId({ materialId: 'mat-1' });
      expect(mockDelete).toHaveBeenCalled();
    });
  });

  describe('searchMaterialChunks', () => {
    const sampleEmbedding = [0.05, -0.02, 0.12, 0.34];

    it('executes cosine similarity vector search with deterministic numeric embedding and returns ranked results', async () => {
      const mockRows = [
        {
          id: 'chunk-1',
          materialId: 'mat-1',
          projectId: 'proj-1',
          materialTitle: 'Calculus Notes',
          filename: 'calc.pdf',
          fileType: 'application/pdf',
          chunkIndex: 0,
          content: 'Fundamental theorem of calculus',
          metadata: { pageNumber: 1 },
          similarity: 0.92,
        },
        {
          id: 'chunk-2',
          materialId: 'mat-1',
          projectId: 'proj-1',
          materialTitle: 'Calculus Notes',
          filename: 'calc.pdf',
          fileType: 'application/pdf',
          chunkIndex: 1,
          content: 'Definite and indefinite integrals',
          metadata: { pageNumber: 2 },
          similarity: 0.81,
        },
      ];

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockResolvedValueOnce(mockRows),
              }),
            }),
          }),
        }),
      });

      const results = await searchMaterialChunks({
        projectId: 'proj-1',
        embedding: sampleEmbedding,
        limit: 5,
        threshold: 0.4,
      });

      expect(results).toHaveLength(2);
      expect(results[0].materialTitle).toBe('Calculus Notes');
      expect(results[0].similarity).toBe(0.92);
      expect(results[0].metadata).toEqual({ pageNumber: 1 });
      expect(results[1].similarity).toBe(0.81);
    });

    it('uses default limit (5) and threshold (0.4) when optional parameters are omitted', async () => {
      const mockLimit = vi.fn().mockResolvedValueOnce([]);
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: mockLimit,
              }),
            }),
          }),
        }),
      });

      const results = await searchMaterialChunks({
        projectId: 'proj-1',
        embedding: sampleEmbedding,
      });

      expect(results).toEqual([]);
      expect(mockLimit).toHaveBeenCalledWith(5);
    });

    it('respects custom limit and threshold parameters', async () => {
      const mockLimit = vi.fn().mockResolvedValueOnce([]);
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: mockLimit,
              }),
            }),
          }),
        }),
      });

      await searchMaterialChunks({
        projectId: 'proj-1',
        embedding: sampleEmbedding,
        limit: 10,
        threshold: 0.75,
      });

      expect(mockLimit).toHaveBeenCalledWith(10);
    });

    it('safely normalizes invalid or non-positive limit parameters to default', async () => {
      const mockLimit = vi.fn().mockResolvedValue([]);
      mockSelect.mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: mockLimit,
              }),
            }),
          }),
        }),
      });

      await searchMaterialChunks({
        projectId: 'proj-1',
        embedding: sampleEmbedding,
        limit: -3,
      });
      expect(mockLimit).toHaveBeenLastCalledWith(5);

      await searchMaterialChunks({
        projectId: 'proj-1',
        embedding: sampleEmbedding,
        limit: 0,
      });
      expect(mockLimit).toHaveBeenLastCalledWith(5);

      await searchMaterialChunks({
        projectId: 'proj-1',
        embedding: sampleEmbedding,
        limit: Number.NaN,
      });
      expect(mockLimit).toHaveBeenLastCalledWith(5);
    });

    it('returns empty array when embedding is empty array or invalid without calling database', async () => {
      const emptyResult = await searchMaterialChunks({
        projectId: 'proj-1',
        embedding: [],
      });
      expect(emptyResult).toEqual([]);

      const invalidResult = await searchMaterialChunks({
        projectId: 'proj-1',
        embedding: null as unknown as number[],
      });
      expect(invalidResult).toEqual([]);

      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('returns empty array when projectId is empty or whitespace without calling database', async () => {
      const emptyProjectResult = await searchMaterialChunks({
        projectId: '',
        embedding: sampleEmbedding,
      });
      expect(emptyProjectResult).toEqual([]);

      const whitespaceProjectResult = await searchMaterialChunks({
        projectId: '   ',
        embedding: sampleEmbedding,
      });
      expect(whitespaceProjectResult).toEqual([]);

      expect(mockSelect).not.toHaveBeenCalled();
    });

    it('returns empty array when no matches are found in database', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockResolvedValueOnce([]),
              }),
            }),
          }),
        }),
      });

      const results = await searchMaterialChunks({
        projectId: 'proj-1',
        embedding: sampleEmbedding,
      });

      expect(results).toEqual([]);
    });

    it('safely handles non-object metadata and string similarity conversion', async () => {
      const mockRows = [
        {
          id: 'chunk-3',
          materialId: 'mat-3',
          projectId: 'proj-1',
          materialTitle: 'Notes',
          filename: 'notes.txt',
          fileType: 'text/plain',
          chunkIndex: 0,
          content: 'Sample raw content',
          metadata: null,
          similarity: '0.875' as unknown as number,
        },
      ];

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockResolvedValueOnce(mockRows),
              }),
            }),
          }),
        }),
      });

      const results = await searchMaterialChunks({
        projectId: 'proj-1',
        embedding: sampleEmbedding,
      });

      expect(results).toHaveLength(1);
      expect(results[0].metadata).toEqual({});
      expect(results[0].similarity).toBe(0.875);
    });

    it('throws ChatbotError on database search query failure', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          innerJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              orderBy: vi.fn().mockReturnValueOnce({
                limit: vi.fn().mockRejectedValueOnce(new Error('pgvector index error')),
              }),
            }),
          }),
        }),
      });

      await expect(
        searchMaterialChunks({
          projectId: 'proj-1',
          embedding: sampleEmbedding,
        }),
      ).rejects.toThrow(ChatbotError);
    });
  });
});
