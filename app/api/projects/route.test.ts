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

const mockGetProjectsWithChatCount = vi.fn();
const mockCreateProject = vi.fn();

vi.mock('@/lib/db/queries/project', () => ({
  getProjectsWithChatCount: (...args: unknown[]) => mockGetProjectsWithChatCount(...args),
  createProject: (...args: unknown[]) => mockCreateProject(...args),
}));

describe('Projects API Route (/api/projects)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/projects', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const request = new Request('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(401);
    });

    it('returns projects list when authenticated', async () => {
      const testUser = { id: 'user-1' };
      mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });
      const mockProjects = [{ id: 'p1', name: 'Math', userId: 'user-1', chatCount: 2 }];
      mockGetProjectsWithChatCount.mockResolvedValueOnce(mockProjects);

      const request = new Request('http://localhost:3000/api/projects');
      const response = await GET(request);

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.projects).toEqual(mockProjects);
      expect(mockGetProjectsWithChatCount).toHaveBeenCalledWith({ userId: 'user-1' });
    });
  });

  describe('POST /api/projects', () => {
    it('returns 401 when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Linear Algebra' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(401);
    });

    it('returns 400 when project name is empty or invalid', async () => {
      const testUser = { id: 'user-1' };
      mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });

      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('creates project and returns 201 when valid', async () => {
      const testUser = { id: 'user-1' };
      mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });
      const mockCreated = { id: 'p1', name: 'Linear Algebra', userId: 'user-1' };
      mockCreateProject.mockResolvedValueOnce(mockCreated);

      const request = new Request('http://localhost:3000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Linear Algebra' }),
      });
      const response = await POST(request);

      expect(response.status).toBe(201);
      const json = await response.json();
      expect(json.project).toEqual(mockCreated);
      expect(mockCreateProject).toHaveBeenCalledWith({
        name: 'Linear Algebra',
        userId: 'user-1',
      });
    });
  });
});
