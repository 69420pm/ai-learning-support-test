import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, GET } from './route';

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

const mockGetProjectById = vi.fn();
vi.mock('@/lib/db/queries/project', () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

const mockGetMaterialById = vi.fn();
const mockDeleteMaterialById = vi.fn();
const mockGetMaterialChunksByMaterialId = vi.fn();
const mockDeleteMaterialChunksByMaterialId = vi.fn();
vi.mock('@/lib/db/queries/material', () => ({
  getMaterialById: (...args: unknown[]) => mockGetMaterialById(...args),
  deleteMaterialById: (...args: unknown[]) => mockDeleteMaterialById(...args),
  getMaterialChunksByMaterialId: (...args: unknown[]) => mockGetMaterialChunksByMaterialId(...args),
  deleteMaterialChunksByMaterialId: (...args: unknown[]) =>
    mockDeleteMaterialChunksByMaterialId(...args),
}));

const mockDeleteStorage = vi.fn();
vi.mock('@/lib/storage', () => ({
  getStorageDriver: () => ({
    delete: (...args: unknown[]) => mockDeleteStorage(...args),
  }),
}));

describe('Project Single Material API Route (/api/projects/[id]/materials/[materialId])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects/[id]/materials/[materialId]', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(401);
    });

    it('returns 404 when project does not exist for user', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(404);
    });

    it('returns 404 when material does not exist', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', userId: 'user-1' });
      mockGetMaterialById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(404);
    });

    it('returns 200 with material metadata and chunk list', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', userId: 'user-1' });

      const mockMaterial = {
        id: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
        title: 'Quantum Computing Notes',
        filename: 'quantum.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
        storagePath: 'proj-1/quantum.pdf',
        status: 'ready',
        metadata: { pageCount: 2, chunkCount: 2, tokenCount: 250 },
        createdAt: '2026-08-20T17:00:00.000Z',
      };
      mockGetMaterialById.mockResolvedValueOnce(mockMaterial);

      const mockChunks = [
        {
          id: 'chunk-1',
          materialId: 'mat-1',
          projectId: 'proj-1',
          userId: 'user-1',
          chunkIndex: 0,
          content: '## Section 1: Qubits\nQubits can exist in superposition.',
          tokenCount: 120,
          metadata: { pageNumber: 1 },
          createdAt: '2026-08-20T17:01:00.000Z',
        },
        {
          id: 'chunk-2',
          materialId: 'mat-1',
          projectId: 'proj-1',
          userId: 'user-1',
          chunkIndex: 1,
          content: '## Section 2: Entanglement\nQuantum entanglement connects particles.',
          tokenCount: 130,
          metadata: { pageNumber: 2 },
          createdAt: '2026-08-20T17:01:01.000Z',
        },
      ];
      mockGetMaterialChunksByMaterialId.mockResolvedValueOnce(mockChunks);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.material).toEqual(mockMaterial);
      expect(json.chunks).toEqual(mockChunks);
      expect(json.content).toContain('## Section 1: Qubits');
      expect(json.content).toContain('## Section 2: Entanglement');
    });
  });

  describe('DELETE /api/projects/[id]/materials/[materialId]', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(401);
    });

    it('returns 404 when project does not exist', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(404);
    });

    it('returns 404 when material does not exist', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', userId: 'user-1' });
      mockGetMaterialById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(404);
    });

    it('atomically cascades deletion across chunks, db record, and physical storage blob', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', userId: 'user-1' });

      const mockMaterial = {
        id: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
        title: 'Notes',
        storagePath: 'proj-1/uuid-notes.pdf',
      };
      mockGetMaterialById.mockResolvedValueOnce(mockMaterial);
      mockDeleteMaterialChunksByMaterialId.mockResolvedValueOnce(undefined);
      mockDeleteMaterialById.mockResolvedValueOnce(mockMaterial);
      mockDeleteStorage.mockResolvedValueOnce(undefined);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1', {
        method: 'DELETE',
      });
      const response = await DELETE(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({ success: true, materialId: 'mat-1' });

      expect(mockDeleteMaterialChunksByMaterialId).toHaveBeenCalledWith({ materialId: 'mat-1' });
      expect(mockDeleteMaterialById).toHaveBeenCalledWith({
        id: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
      });
      expect(mockDeleteStorage).toHaveBeenCalledWith('proj-1/uuid-notes.pdf');
    });
  });
});
