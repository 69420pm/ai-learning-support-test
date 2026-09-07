import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import { GET, kcDeepInspectionResponseSchema } from './route';

const mockRequireAuthUser = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  requireAuthUser: (...args: unknown[]) => mockRequireAuthUser(...args),
}));

const mockGetProjectById = vi.fn();
vi.mock('@/lib/db/queries/project', () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

const mockGetKnowledgeComponentDeepInspection = vi.fn();
vi.mock('@/lib/db/queries/knowledge', () => ({
  getKnowledgeComponentDeepInspection: (...args: unknown[]) =>
    mockGetKnowledgeComponentDeepInspection(...args),
}));

describe('GET /api/projects/[id]/graph/components/[kcId]', () => {
  const defaultUser = { id: 'user-1', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockRequireAuthUser.mockRejectedValueOnce(new ChatbotError('unauthorized:auth'));

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph/components/kc-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'proj-1', kcId: 'kc-1' }),
    });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.code).toBe('unauthorized:auth');
  });

  it('returns 404 when project does not exist or user is not authorized', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce(null);

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph/components/kc-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'proj-1', kcId: 'kc-1' }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.code).toBe('not_found:chat');
    expect(mockGetProjectById).toHaveBeenCalledWith({ id: 'proj-1', userId: 'user-1' });
  });

  it('returns 400 when route params are invalid (empty strings)', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);

    const request = new Request('http://localhost:3000/api/projects/%20/graph/components/%20');
    const response = await GET(request, {
      params: Promise.resolve({ id: '   ', kcId: '   ' }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe('bad_request:api');
  });

  it('returns 404 when knowledge component is not found', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce({
      id: 'proj-1',
      name: 'Algorithms',
      userId: 'user-1',
    });
    mockGetKnowledgeComponentDeepInspection.mockResolvedValueOnce(null);

    const request = new Request(
      'http://localhost:3000/api/projects/proj-1/graph/components/non-existent',
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: 'proj-1', kcId: 'non-existent' }),
    });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.code).toBe('not_found:learning');
    expect(mockGetKnowledgeComponentDeepInspection).toHaveBeenCalledWith({
      projectId: 'proj-1',
      kcId: 'non-existent',
    });
  });

  it('returns 200 with KC record, grounded exercises, and originating chunk excerpts by ID', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce({
      id: 'proj-1',
      name: 'Algorithms',
      userId: 'user-1',
    });

    const mockInspectionResult = {
      component: {
        id: 'kc-1',
        projectId: 'proj-1',
        name: 'Breadth-First Search',
        slug: 'breadth-first-search',
        pacerCategory: 'procedural',
        bloomLevel: 3,
        sourceMaterialId: 'mat-1',
        aliases: ['BFS'],
      },
      exercises: [
        {
          id: 'ex-1',
          projectId: 'proj-1',
          materialId: 'mat-1',
          kcId: 'kc-1',
          pageNumber: 42,
          title: 'BFS Traversal Order',
          prompt: 'Trace BFS on graph G starting at node A.',
          questionType: 'conceptual',
          difficulty: 2,
        },
      ],
      chunks: [
        {
          id: 'chunk-1',
          materialId: 'mat-1',
          chunkIndex: 4,
          content: 'Breadth-First Search systematically explores the edges of G...',
          metadata: { pageNumber: 42 },
        },
      ],
    };

    mockGetKnowledgeComponentDeepInspection.mockResolvedValueOnce(mockInspectionResult);

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph/components/kc-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'proj-1', kcId: 'kc-1' }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(() => kcDeepInspectionResponseSchema.parse(json)).not.toThrow();
    expect(json.component.id).toBe('kc-1');
    expect(json.component.name).toBe('Breadth-First Search');
    expect(json.exercises).toHaveLength(1);
    expect(json.exercises[0].id).toBe('ex-1');
    expect(json.chunks).toHaveLength(1);
    expect(json.chunks[0].id).toBe('chunk-1');
    expect(mockGetKnowledgeComponentDeepInspection).toHaveBeenCalledWith({
      projectId: 'proj-1',
      kcId: 'kc-1',
    });
  });

  it('returns 200 with KC inspection when resolved by slug', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce({
      id: 'proj-1',
      name: 'Algorithms',
      userId: 'user-1',
    });

    const mockInspectionResult = {
      component: {
        id: 'kc-2',
        projectId: 'proj-1',
        name: 'Dijkstra Algorithm',
        slug: 'dijkstra-algorithm',
        pacerCategory: 'procedural',
        bloomLevel: 4,
        sourceMaterialId: null,
        aliases: [],
      },
      exercises: [],
      chunks: [],
    };

    mockGetKnowledgeComponentDeepInspection.mockResolvedValueOnce(mockInspectionResult);

    const request = new Request(
      'http://localhost:3000/api/projects/proj-1/graph/components/dijkstra-algorithm',
    );
    const response = await GET(request, {
      params: Promise.resolve({ id: 'proj-1', kcId: 'dijkstra-algorithm' }),
    });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(() => kcDeepInspectionResponseSchema.parse(json)).not.toThrow();
    expect(json.component.slug).toBe('dijkstra-algorithm');
    expect(json.exercises).toEqual([]);
    expect(json.chunks).toEqual([]);
    expect(mockGetKnowledgeComponentDeepInspection).toHaveBeenCalledWith({
      projectId: 'proj-1',
      kcId: 'dijkstra-algorithm',
    });
  });

  it('returns 400 when database error occurs during inspection', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce({
      id: 'proj-1',
      name: 'Algorithms',
      userId: 'user-1',
    });
    mockGetKnowledgeComponentDeepInspection.mockRejectedValueOnce(
      new Error('Inspection query failed'),
    );

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph/components/kc-1');
    const response = await GET(request, {
      params: Promise.resolve({ id: 'proj-1', kcId: 'kc-1' }),
    });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe('bad_request:api');
  });
});
