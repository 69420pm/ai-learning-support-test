import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import { DELETE, GET, PATCH } from './route';

const mockRequireAuthUser = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  requireAuthUser: (...args: unknown[]) => mockRequireAuthUser(...args),
}));

const mockUpdateProjectName = vi.fn();
const mockGetProjectById = vi.fn();
const mockDeleteProjectById = vi.fn();

vi.mock('@/lib/db/queries/project', () => ({
  updateProjectName: (...args: unknown[]) => mockUpdateProjectName(...args),
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
  deleteProjectById: (...args: unknown[]) => mockDeleteProjectById(...args),
}));

const mockPurgeProjectMaterialsStorage = vi.fn();
vi.mock('@/lib/materials', () => ({
  purgeProjectMaterialsStorage: (...args: unknown[]) => mockPurgeProjectMaterialsStorage(...args),
}));

describe('Project Item API Route (/api/projects/[id])', () => {
  const defaultUser = { id: 'user-1', email: 'test@example.com' };
  const defaultProject = { id: 'p1', userId: 'user-1', name: 'Math' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      mockRequireAuthUser.mockRejectedValueOnce(new ChatbotError('unauthorized:chat'));

      const request = new Request('http://localhost:3000/api/projects/p1');
      const response = await GET(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.code).toBe('unauthorized:chat');
    });

    it('returns 404 when project does not exist for user', async () => {
      mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
      mockGetProjectById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/projects/p1');
      const response = await GET(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.code).toBe('not_found:chat');
      expect(mockGetProjectById).toHaveBeenCalledWith({ id: 'p1', userId: 'user-1' });
    });

    it('returns project when authenticated and project exists', async () => {
      mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
      mockGetProjectById.mockResolvedValueOnce(defaultProject);

      const request = new Request('http://localhost:3000/api/projects/p1');
      const response = await GET(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.project).toEqual(defaultProject);
      expect(mockGetProjectById).toHaveBeenCalledWith({ id: 'p1', userId: 'user-1' });
    });
  });

  describe('PATCH /api/projects/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      mockRequireAuthUser.mockRejectedValueOnce(new ChatbotError('unauthorized:chat'));

      const request = new Request('http://localhost:3000/api/projects/p1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.code).toBe('unauthorized:chat');
    });

    it('returns 400 when name is invalid', async () => {
      mockRequireAuthUser.mockResolvedValueOnce(defaultUser);

      const request = new Request('http://localhost:3000/api/projects/p1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(400);
    });

    it('updates project and returns 200', async () => {
      mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
      const updated = { id: 'p1', name: 'Updated Name', userId: defaultUser.id };
      mockUpdateProjectName.mockResolvedValueOnce(updated);

      const request = new Request('http://localhost:3000/api/projects/p1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.project).toEqual(updated);
      expect(mockUpdateProjectName).toHaveBeenCalledWith({
        id: 'p1',
        userId: 'user-1',
        name: 'Updated Name',
      });
    });
  });

  describe('DELETE /api/projects/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      mockRequireAuthUser.mockRejectedValueOnce(new ChatbotError('unauthorized:chat'));

      const request = new Request('http://localhost:3000/api/projects/p1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.code).toBe('unauthorized:chat');
    });

    it('returns 404 when project does not exist or does not belong to user', async () => {
      mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
      mockGetProjectById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/projects/p1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(404);
      expect(mockGetProjectById).toHaveBeenCalledWith({
        id: 'p1',
        userId: 'user-1',
      });
      expect(mockPurgeProjectMaterialsStorage).not.toHaveBeenCalled();
      expect(mockDeleteProjectById).not.toHaveBeenCalled();
    });

    it('purges storage blobs and deletes project database record in order, returning 200', async () => {
      mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
      mockGetProjectById.mockResolvedValueOnce(defaultProject);

      const callOrder: string[] = [];
      mockPurgeProjectMaterialsStorage.mockImplementationOnce(() => {
        callOrder.push('purgeStorage');
        return Promise.resolve({ purgedCount: 2, totalMaterials: 2 });
      });
      mockDeleteProjectById.mockImplementationOnce(() => {
        callOrder.push('deleteDb');
        return Promise.resolve(defaultProject);
      });

      const request = new Request('http://localhost:3000/api/projects/p1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json).toEqual({ success: true, message: 'Project deleted successfully' });

      expect(mockGetProjectById).toHaveBeenCalledWith({
        id: 'p1',
        userId: 'user-1',
      });
      expect(mockPurgeProjectMaterialsStorage).toHaveBeenCalledWith({
        projectId: 'p1',
        userId: 'user-1',
      });
      expect(mockDeleteProjectById).toHaveBeenCalledWith({
        id: 'p1',
        userId: 'user-1',
      });

      // Storage purge must occur BEFORE project db deletion to preserve material references
      expect(callOrder).toEqual(['purgeStorage', 'deleteDb']);
    });

    it('maps domain ChatbotError from storage purge to error response', async () => {
      mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
      mockGetProjectById.mockResolvedValueOnce(defaultProject);
      mockPurgeProjectMaterialsStorage.mockRejectedValueOnce(
        new ChatbotError('bad_request:document', 'A valid project ID is required.'),
      );

      const request = new Request('http://localhost:3000/api/projects/p1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe('bad_request:document');
      expect(json.cause).toBe('A valid project ID is required.');
      expect(mockDeleteProjectById).not.toHaveBeenCalled();
    });

    it('returns 400 bad_request:api when an unexpected error occurs during deletion', async () => {
      mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
      mockGetProjectById.mockResolvedValueOnce(defaultProject);
      mockPurgeProjectMaterialsStorage.mockRejectedValueOnce(new Error('Unexpected network crash'));

      const request = new Request('http://localhost:3000/api/projects/p1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe('bad_request:api');
      expect(mockDeleteProjectById).not.toHaveBeenCalled();
    });
  });
});
