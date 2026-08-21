import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Material, MaterialChunk } from '@/lib/db/schema';
import { ChatbotError } from '@/lib/errors';
import {
  inspectMaterialContent,
  inspectMaterialInputSchema,
  synthesizeMaterialContent,
} from './inspection';

const mockGetMaterialById = vi.fn();
const mockGetMaterialChunksByMaterialId = vi.fn();

vi.mock('@/lib/db/queries/material', () => ({
  getMaterialById: (...args: unknown[]) => mockGetMaterialById(...args),
  getMaterialChunksByMaterialId: (...args: unknown[]) => mockGetMaterialChunksByMaterialId(...args),
}));

describe('Material Content Inspection Domain Logic (lib/materials/inspection)', () => {
  const sampleMaterial: Material = {
    id: 'mat-100',
    projectId: 'proj-1',
    userId: 'user-1',
    title: 'Lecture 1: Quantum Mechanics',
    filename: 'lecture1.pdf',
    fileType: 'application/pdf',
    fileSize: 1024 * 50,
    storagePath: 'proj-1/uuid-lecture1.pdf',
    status: 'ready',
    errorMessage: null,
    metadata: { pageCount: 2, chunkCount: 3, tokenCount: 450 },
    createdAt: new Date('2026-08-20T10:00:00.000Z'),
    updatedAt: new Date('2026-08-20T10:05:00.000Z'),
  };

  const sampleChunks: MaterialChunk[] = [
    {
      id: 'chunk-1',
      materialId: 'mat-100',
      projectId: 'proj-1',
      userId: 'user-1',
      chunkIndex: 0,
      content: '# Introduction\nQuantum mechanics is a fundamental theory in physics.',
      tokenCount: 150,
      embedding: null,
      metadata: { pageNumber: 1 },
      createdAt: new Date('2026-08-20T10:01:00.000Z'),
    },
    {
      id: 'chunk-2',
      materialId: 'mat-100',
      projectId: 'proj-1',
      userId: 'user-1',
      chunkIndex: 1,
      content: '## Superposition\nParticles can exist in linear combinations of states.',
      tokenCount: 160,
      embedding: null,
      metadata: { pageNumber: 1 },
      createdAt: new Date('2026-08-20T10:02:00.000Z'),
    },
    {
      id: 'chunk-3',
      materialId: 'mat-100',
      projectId: 'proj-1',
      userId: 'user-1',
      chunkIndex: 2,
      content: '## Entanglement\nSpooky action at a distance connects multiple quantum systems.',
      tokenCount: 140,
      embedding: null,
      metadata: { pageNumber: 2 },
      createdAt: new Date('2026-08-20T10:03:00.000Z'),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('inspectMaterialInputSchema', () => {
    it('validates correct input parameters', () => {
      const valid = inspectMaterialInputSchema.safeParse({
        materialId: 'mat-100',
        projectId: 'proj-1',
        userId: 'user-1',
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.materialId).toBe('mat-100');
        expect(valid.data.projectId).toBe('proj-1');
        expect(valid.data.userId).toBe('user-1');
      }
    });

    it('rejects empty or whitespace-only strings', () => {
      expect(
        inspectMaterialInputSchema.safeParse({
          materialId: '   ',
          projectId: 'proj-1',
          userId: 'user-1',
        }).success,
      ).toBe(false);

      expect(
        inspectMaterialInputSchema.safeParse({
          materialId: 'mat-100',
          projectId: '',
          userId: 'user-1',
        }).success,
      ).toBe(false);

      expect(
        inspectMaterialInputSchema.safeParse({
          materialId: 'mat-100',
          projectId: 'proj-1',
          userId: '  ',
        }).success,
      ).toBe(false);
    });
  });

  describe('inspectMaterialContent', () => {
    it('successfully fetches material and returns sorted chunks and concatenated content', async () => {
      mockGetMaterialById.mockResolvedValueOnce(sampleMaterial);
      mockGetMaterialChunksByMaterialId.mockResolvedValueOnce(sampleChunks);

      const result = await inspectMaterialContent({
        materialId: 'mat-100',
        projectId: 'proj-1',
        userId: 'user-1',
      });

      expect(mockGetMaterialById).toHaveBeenCalledWith({
        id: 'mat-100',
      });
      expect(mockGetMaterialChunksByMaterialId).toHaveBeenCalledWith({
        materialId: 'mat-100',
      });

      expect(result.material).toEqual(sampleMaterial);
      expect(result.chunks).toEqual(sampleChunks);
      expect(result.content).toBe(
        '# Introduction\nQuantum mechanics is a fundamental theory in physics.\n\n' +
          '## Superposition\nParticles can exist in linear combinations of states.\n\n' +
          '## Entanglement\nSpooky action at a distance connects multiple quantum systems.',
      );
    });

    it('guarantees ascending chunk index order even if DB returns out of order', async () => {
      mockGetMaterialById.mockResolvedValueOnce(sampleMaterial);
      // Pass chunks in unordered order: [chunk-3 (idx 2), chunk-1 (idx 0), chunk-2 (idx 1)]
      mockGetMaterialChunksByMaterialId.mockResolvedValueOnce([
        sampleChunks[2],
        sampleChunks[0],
        sampleChunks[1],
      ]);

      const result = await inspectMaterialContent({
        materialId: 'mat-100',
        projectId: 'proj-1',
        userId: 'user-1',
      });

      expect(result.chunks.map((c) => c.chunkIndex)).toEqual([0, 1, 2]);
      expect(result.chunks[0].id).toBe('chunk-1');
      expect(result.chunks[1].id).toBe('chunk-2');
      expect(result.chunks[2].id).toBe('chunk-3');
      expect(result.content.startsWith('# Introduction')).toBe(true);
      expect(result.content.endsWith('multiple quantum systems.')).toBe(true);
    });

    it('handles materials with 0 chunks cleanly with empty content string', async () => {
      mockGetMaterialById.mockResolvedValueOnce(sampleMaterial);
      mockGetMaterialChunksByMaterialId.mockResolvedValueOnce([]);

      const result = await inspectMaterialContent({
        materialId: 'mat-100',
        projectId: 'proj-1',
        userId: 'user-1',
      });

      expect(result.material).toEqual(sampleMaterial);
      expect(result.chunks).toEqual([]);
      expect(result.content).toBe('');
    });

    it('throws bad_request error if materialId is missing or empty', async () => {
      await expect(
        inspectMaterialContent({
          materialId: '',
          projectId: 'proj-1',
          userId: 'user-1',
        }),
      ).rejects.toThrow(ChatbotError);

      await expect(
        inspectMaterialContent({
          materialId: '   ',
          projectId: 'proj-1',
          userId: 'user-1',
        }),
      ).rejects.toMatchObject({
        type: 'bad_request',
        surface: 'document',
      });
    });

    it('throws bad_request error if projectId is missing or empty', async () => {
      await expect(
        inspectMaterialContent({
          materialId: 'mat-100',
          projectId: '',
          userId: 'user-1',
        }),
      ).rejects.toMatchObject({
        type: 'bad_request',
        surface: 'document',
      });
    });

    it('throws unauthorized error if userId is missing or empty', async () => {
      await expect(
        inspectMaterialContent({
          materialId: 'mat-100',
          projectId: 'proj-1',
          userId: '',
        }),
      ).rejects.toMatchObject({
        type: 'unauthorized',
        surface: 'document',
      });
    });

    it('throws not_found error when material record does not exist', async () => {
      mockGetMaterialById.mockResolvedValueOnce(null);

      await expect(
        inspectMaterialContent({
          materialId: 'non-existent-mat',
          projectId: 'proj-1',
          userId: 'user-1',
        }),
      ).rejects.toMatchObject({
        type: 'not_found',
        surface: 'document',
      });
    });

    it('throws forbidden error when material belongs to a different user', async () => {
      mockGetMaterialById.mockResolvedValueOnce({
        ...sampleMaterial,
        userId: 'other-user',
      });

      await expect(
        inspectMaterialContent({
          materialId: 'mat-100',
          projectId: 'proj-1',
          userId: 'user-1',
        }),
      ).rejects.toMatchObject({
        type: 'forbidden',
        surface: 'document',
      });
    });

    it('throws not_found error when material belongs to a different project', async () => {
      mockGetMaterialById.mockResolvedValueOnce({
        ...sampleMaterial,
        projectId: 'other-project',
      });

      await expect(
        inspectMaterialContent({
          materialId: 'mat-100',
          projectId: 'proj-1',
          userId: 'user-1',
        }),
      ).rejects.toMatchObject({
        type: 'not_found',
        surface: 'document',
      });
    });

    it('re-throws existing ChatbotError or wraps unhandled DB query errors', async () => {
      mockGetMaterialById.mockRejectedValueOnce(new Error('Postgres connection terminated'));

      await expect(
        inspectMaterialContent({
          materialId: 'mat-100',
          projectId: 'proj-1',
          userId: 'user-1',
        }),
      ).rejects.toThrow();
    });
  });

  describe('synthesizeMaterialContent', () => {
    it('concatenates chunk contents in index order with double newline', () => {
      const outOfOrderChunks: MaterialChunk[] = [sampleChunks[1], sampleChunks[2], sampleChunks[0]];

      const content = synthesizeMaterialContent(outOfOrderChunks);
      expect(content).toBe(
        '# Introduction\nQuantum mechanics is a fundamental theory in physics.\n\n' +
          '## Superposition\nParticles can exist in linear combinations of states.\n\n' +
          '## Entanglement\nSpooky action at a distance connects multiple quantum systems.',
      );
    });

    it('returns empty string for empty chunks array', () => {
      expect(synthesizeMaterialContent([])).toBe('');
    });
  });
});
