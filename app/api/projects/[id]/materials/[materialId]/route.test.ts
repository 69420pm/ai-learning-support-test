import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
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

const mockInspectMaterialContent = vi.fn();
vi.mock('@/lib/materials', () => ({
  inspectMaterialContent: (...args: unknown[]) => mockInspectMaterialContent(...args),
}));

const mockGetMaterialById = vi.fn();
const mockDeleteMaterialById = vi.fn();
const mockDeleteMaterialChunksByMaterialId = vi.fn();
vi.mock('@/lib/db/queries/material', () => ({
  getMaterialById: (...args: unknown[]) => mockGetMaterialById(...args),
  deleteMaterialById: (...args: unknown[]) => mockDeleteMaterialById(...args),
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
      const json = await response.json();
      expect(json.code).toBe('unauthorized:chat');
    });

    it('returns 404 when project does not exist for user', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(404);
      expect(mockGetProjectById).toHaveBeenCalledWith({ id: 'proj-1', userId: 'user-1' });
    });

    it('delegates to inspectMaterialContent and returns 200 with material, chunks, and content', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', userId: 'user-1' });

      const mockInspectionResult = {
        material: {
          id: 'mat-1',
          projectId: 'proj-1',
          userId: 'user-1',
          title: 'Quantum Computing Notes',
          filename: 'quantum.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
          storagePath: 'proj-1/quantum.pdf',
          status: 'ready' as const,
          metadata: { pageCount: 2, chunkCount: 2, tokenCount: 250 },
          createdAt: new Date('2026-08-20T17:00:00.000Z'),
        },
        chunks: [
          {
            id: 'chunk-1',
            materialId: 'mat-1',
            projectId: 'proj-1',
            userId: 'user-1',
            chunkIndex: 0,
            content: '## Section 1: Qubits\nQubits can exist in superposition.',
            tokenCount: 120,
            metadata: { pageNumber: 1 },
            createdAt: new Date('2026-08-20T17:01:00.000Z'),
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
            createdAt: new Date('2026-08-20T17:01:01.000Z'),
          },
        ],
        content:
          '## Section 1: Qubits\nQubits can exist in superposition.\n\n## Section 2: Entanglement\nQuantum entanglement connects particles.',
      };
      mockInspectMaterialContent.mockResolvedValueOnce(mockInspectionResult);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.material.id).toBe('mat-1');
      expect(json.chunks).toHaveLength(2);
      expect(json.content).toContain('## Section 1: Qubits');
      expect(json.content).toContain('## Section 2: Entanglement');

      expect(mockInspectMaterialContent).toHaveBeenCalledWith({
        materialId: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
      });
    });

    it('maps not_found domain ChatbotError from inspectMaterialContent to 404 response', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', userId: 'user-1' });
      mockInspectMaterialContent.mockRejectedValueOnce(
        new ChatbotError('not_found:document', 'Material not found.'),
      );

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.code).toBe('not_found:document');
      expect(json.cause).toBe('Material not found.');
    });

    it('maps forbidden domain ChatbotError from inspectMaterialContent to 403 response', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', userId: 'user-1' });
      mockInspectMaterialContent.mockRejectedValueOnce(
        new ChatbotError('forbidden:document', 'This document belongs to another user.'),
      );

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.code).toBe('forbidden:document');
      expect(json.cause).toBe('This document belongs to another user.');
    });

    it('maps bad_request domain ChatbotError from inspectMaterialContent to 400 response', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', userId: 'user-1' });
      mockInspectMaterialContent.mockRejectedValueOnce(
        new ChatbotError('bad_request:document', 'Invalid inspection request parameters.'),
      );

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe('bad_request:document');
      expect(json.cause).toBe('Invalid inspection request parameters.');
    });

    it('returns 400 bad_request:api when an unexpected error occurs during inspection', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', userId: 'user-1' });
      mockInspectMaterialContent.mockRejectedValueOnce(new Error('Unexpected DB timeout'));

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials/mat-1');
      const response = await GET(request, {
        params: Promise.resolve({ id: 'proj-1', materialId: 'mat-1' }),
      });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe('bad_request:api');
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
