import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
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

const mockGetMaterialsByProjectId = vi.fn();
vi.mock('@/lib/db/queries/material', () => ({
  getMaterialsByProjectId: (...args: unknown[]) => mockGetMaterialsByProjectId(...args),
}));

const mockIntakeMaterial = vi.fn();
vi.mock('@/lib/materials', () => ({
  intakeMaterial: (...args: unknown[]) => mockIntakeMaterial(...args),
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
      const json = await response.json();
      expect(json.code).toBe('unauthorized:chat');
    });

    it('returns 404 when project does not exist for user', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials');
      const response = await GET(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(404);
      expect(mockGetProjectById).toHaveBeenCalledWith({ id: 'proj-1', userId: 'user-1' });
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
      expect(mockGetMaterialsByProjectId).toHaveBeenCalledWith({
        projectId: 'proj-1',
        userId: 'user-1',
      });
    });

    it('returns 400 when an unexpected error occurs during material query', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Calculus',
        userId: 'user-1',
      });
      mockGetMaterialsByProjectId.mockRejectedValueOnce(new Error('DB connection failure'));

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials');
      const response = await GET(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe('bad_request:api');
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
      const json = await response.json();
      expect(json.code).toBe('unauthorized:chat');
    });

    it('returns 404 when project does not exist or user is not owner', async () => {
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
      expect(mockGetProjectById).toHaveBeenCalledWith({ id: 'proj-1', userId: 'user-1' });
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
      const json = await response.json();
      expect(json.cause).toBe('A valid file is required');
    });

    it('returns 400 when file payload is a string instead of File', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Calculus',
        userId: 'user-1',
      });

      const formData = new FormData();
      formData.append('file', 'just-plain-string');

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials', {
        method: 'POST',
        body: formData,
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.cause).toBe('A valid file is required');
    });

    it('delegates to intakeMaterial with custom title and returns 201 on success', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Calculus',
        userId: 'user-1',
      });

      const file = new File(['hello world'], 'notes.md', { type: 'text/markdown' });
      const createdMaterial = {
        id: 'mat-1',
        projectId: 'proj-1',
        userId: 'user-1',
        title: 'Custom Title',
        filename: 'notes.md',
        fileType: 'text/markdown',
        fileSize: 11,
        storagePath: 'proj-1/uuid-notes.md',
        status: 'pending',
      };
      mockIntakeMaterial.mockResolvedValueOnce(createdMaterial);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', 'Custom Title');

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials', {
        method: 'POST',
        body: formData,
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.material).toEqual(createdMaterial);

      expect(mockIntakeMaterial).toHaveBeenCalledWith({
        projectId: 'proj-1',
        userId: 'user-1',
        file,
        title: 'Custom Title',
      });
    });

    it('delegates to intakeMaterial without title (undefined) and returns 201 on success', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Calculus',
        userId: 'user-1',
      });

      const file = new File(['%PDF-1.4 sample'], 'slides.pdf', { type: 'application/pdf' });
      const createdMaterial = {
        id: 'mat-2',
        projectId: 'proj-1',
        userId: 'user-1',
        title: 'slides.pdf',
        filename: 'slides.pdf',
        fileType: 'application/pdf',
        fileSize: 15,
        storagePath: 'proj-1/uuid-slides.pdf',
        status: 'pending',
      };
      mockIntakeMaterial.mockResolvedValueOnce(createdMaterial);

      const formData = new FormData();
      formData.append('file', file);

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials', {
        method: 'POST',
        body: formData,
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.material).toEqual(createdMaterial);

      expect(mockIntakeMaterial).toHaveBeenCalledWith({
        projectId: 'proj-1',
        userId: 'user-1',
        file,
        title: undefined,
      });
    });

    it('maps domain ChatbotError from intakeMaterial to standard HTTP response', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Calculus',
        userId: 'user-1',
      });

      mockIntakeMaterial.mockRejectedValueOnce(
        new ChatbotError(
          'bad_request:document',
          'Unsupported file format (.exe). Supported: PDF, Markdown, Text, Images.',
        ),
      );

      const formData = new FormData();
      formData.append(
        'file',
        new File(['binary'], 'virus.exe', { type: 'application/x-msdownload' }),
      );

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials', {
        method: 'POST',
        body: formData,
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe('bad_request:document');
      expect(json.cause).toContain('Unsupported file format (.exe)');
    });

    it('returns 400 when an unexpected error occurs during upload intake', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } }, error: null });
      mockGetProjectById.mockResolvedValueOnce({
        id: 'proj-1',
        name: 'Calculus',
        userId: 'user-1',
      });
      mockIntakeMaterial.mockRejectedValueOnce(new Error('Unexpected worker error'));

      const formData = new FormData();
      formData.append('file', new File(['hello'], 'notes.md', { type: 'text/markdown' }));

      const request = new Request('http://localhost:3000/api/projects/proj-1/materials', {
        method: 'POST',
        body: formData,
      });
      const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe('bad_request:api');
    });
  });
});
