import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, PATCH } from './route';

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

const mockUpdateProjectName = vi.fn();
const mockDeleteProjectById = vi.fn();

vi.mock('@/lib/db/queries/project', () => ({
  updateProjectName: (...args: unknown[]) => mockUpdateProjectName(...args),
  deleteProjectById: (...args: unknown[]) => mockDeleteProjectById(...args),
}));

describe('Project Item API Route (/api/projects/[id])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PATCH /api/projects/[id]', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const request = new Request('http://localhost:3000/api/projects/p1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(401);
    });

    it('returns 400 when name is invalid', async () => {
      const testUser = { id: 'user-1' };
      mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });

      const request = new Request('http://localhost:3000/api/projects/p1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });
      const response = await PATCH(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(400);
    });

    it('updates project and returns 200', async () => {
      const testUser = { id: 'user-1' };
      mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });
      const updated = { id: 'p1', name: 'Updated Name', userId: 'user-1' };
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
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const request = new Request('http://localhost:3000/api/projects/p1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(401);
    });

    it('returns 404 when project does not exist or does not belong to user', async () => {
      const testUser = { id: 'user-1' };
      mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });
      mockDeleteProjectById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/projects/p1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(404);
    });

    it('deletes project and returns 200', async () => {
      const testUser = { id: 'user-1' };
      mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });
      mockDeleteProjectById.mockResolvedValueOnce({ id: 'p1', userId: 'user-1', name: 'Math' });

      const request = new Request('http://localhost:3000/api/projects/p1', { method: 'DELETE' });
      const response = await DELETE(request, { params: Promise.resolve({ id: 'p1' }) });

      expect(response.status).toBe(200);
      expect(mockDeleteProjectById).toHaveBeenCalledWith({
        id: 'p1',
        userId: 'user-1',
      });
    });
  });
});
