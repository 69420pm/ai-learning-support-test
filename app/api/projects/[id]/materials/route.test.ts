import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET, POST } from './route';

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

const mockCreateMaterial = vi.fn();
const mockGetMaterialsByProjectId = vi.fn();
vi.mock('@/lib/db/queries/material', () => ({
  createMaterial: (...args: unknown[]) => mockCreateMaterial(...args),
  getMaterialsByProjectId: (...args: unknown[]) => mockGetMaterialsByProjectId(...args),
}));

const mockUpload = vi.fn();
vi.mock('@/lib/storage', () => ({
  getStorageDriver: () => ({
    upload: (...args: unknown[]) => mockUpload(...args),
  }),
}));

const mockSendIngestJob = vi.fn();
vi.mock('@/lib/queue', () => ({
  sendIngestJob: (...args: unknown[]) => mockSendIngestJob(...args),
}));

describe('Project Materials API Route (/api/projects/[id]/materials)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects/[id]/materials', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials');
      const response = await GET(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(401);
    });

    it('returns 404 when project does not exist for user', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials');
      const response = await GET(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(404);
    });

    it('returns 200 with list of materials for project', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Calculus',
        userId: 'user-1',
      });
      const mockMaterials = [
        { id: 'mat-1', title: 'Notes 1', status: 'ready', createdAt: '2026-08-20T17:00:00.000Z' },
      ];
      mockGetMaterialsByProjectId.mockResolvedValueOnce(mockMaterials);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials');
      const response = await GET(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.materials).toEqual(mockMaterials);
    });
  });

  describe('POST /api/projects/[id]/materials', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const formData = new FormData();
      formData.append('file', new File(['hello'], 'notes.md', { type: 'text/markdown' }));

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials', {
        method: 'POST',
        body: formData,
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(401);
    });

    it('returns 404 when project does not exist', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce(null);

      const formData = new FormData();
      formData.append('file', new File(['hello'], 'notes.md', { type: 'text/markdown' }));

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials', {
        method: 'POST',
        body: formData,
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(404);
    });

    it('returns 400 when no file is uploaded', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Calculus',
        userId: 'user-1',
      });

      const formData = new FormData();
      formData.append('title', 'No file attached');

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials', {
        method: 'POST',
        body: formData,
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(400);
    });

    it('returns 400 for unsupported file types', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Calculus',
        userId: 'user-1',
      });

      const formData = new FormData();
      formData.append(
        'file',
        new File(['exe binary'], 'virus.exe', { type: 'application/x-msdownload' }),
      );

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials', {
        method: 'POST',
        body: formData,
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(400);
    });

    it('uploads file, creates record and dispatches ingestion job returning 201', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Calculus',
        userId: 'user-1',
      });
      mockUpload.mockResolvedValueOnce({ path: 'proj-1/uuid-notes.md', size: 1024 });

      const createdMat = {
        id: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
        title: 'My Notes',
        filename: 'notes.md',
        fileType: 'text/markdown',
        fileSize: 11,
        storagePath: 'proj-1/uuid-notes.md',
        status: 'pending',
      };
      mockCreateMaterial.mockResolvedValueOnce(createdMat);
      mockSendIngestJob.mockResolvedValueOnce('job-123');

      const formData = new FormData();
      formData.append('file', new File(['hello world'], 'notes.md', { type: 'text/markdown' }));
      formData.append('title', 'My Notes');

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials', {
        method: 'POST',
        body: formData,
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.material).toEqual(createdMat);

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('proj-1/'),
        expect.any(File),
        'text/markdown',
      );
      expect(mockCreateMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          userId: 'user-1',
          title: 'My Notes',
          filename: 'notes.md',
        }),
      );
      expect(mockSendIngestJob).toHaveBeenCalledWith({
        materialId: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: expect.stringContaining('proj-1/'),
        fileType: 'text/markdown',
      });
    });
  });
});
