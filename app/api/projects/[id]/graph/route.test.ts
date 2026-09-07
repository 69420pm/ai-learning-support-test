import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import { GET, projectGraphResponseSchema } from './route';

const mockRequireAuthUser = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  requireAuthUser: (...args: unknown[]) => mockRequireAuthUser(...args),
}));

const mockGetProjectById = vi.fn();
vi.mock('@/lib/db/queries/project', () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

const mockGetProjectGraphData = vi.fn();

vi.mock('@/lib/db/queries/knowledge', () => ({
  getProjectGraphData: (...args: unknown[]) => mockGetProjectGraphData(...args),
}));

describe('GET /api/projects/[id]/graph', () => {
  const defaultUser = { id: 'user-1', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockRequireAuthUser.mockRejectedValueOnce(new ChatbotError('unauthorized:auth'));

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph');
    const response = await GET(request, { params: Promise.resolve({ id: 'proj-1' }) });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.code).toBe('unauthorized:auth');
  });

  it('returns 404 when project does not exist or user is not authorized', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce(null);

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph');
    const response = await GET(request, { params: Promise.resolve({ id: 'proj-1' }) });

    expect(response.status).toBe(404);
    const json = await response.json();
    expect(json.code).toBe('not_found:chat');
    expect(mockGetProjectById).toHaveBeenCalledWith({ id: 'proj-1', userId: 'user-1' });
  });

  it('returns 400 when project id parameter is empty', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);

    const request = new Request('http://localhost:3000/api/projects/%20/graph');
    const response = await GET(request, { params: Promise.resolve({ id: '   ' }) });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.code).toBe('bad_request:api');
  });

  it('returns 200 with empty graph topology and default zeroed diagnostics', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce({
      id: 'proj-1',
      name: 'Algorithms',
      userId: 'user-1',
    });

    const emptyGraphData = {
      components: [],
      dependencies: [],
      materials: [],
      diagnostics: {
        totalComponents: 0,
        nodeCount: 0,
        totalDependencies: 0,
        edgeCount: 0,
        orphanCount: 0,
        hasCycles: false,
        cyclePaths: [],
        pacerDistribution: {
          procedural: 0,
          conceptual: 0,
          analogous: 0,
          evidence: 0,
          reference: 0,
        },
        bloomDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0,
          6: 0,
        },
      },
    };

    mockGetProjectGraphData.mockResolvedValueOnce(emptyGraphData);

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph');
    const response = await GET(request, { params: Promise.resolve({ id: 'proj-1' }) });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toEqual(emptyGraphData);
    expect(() => projectGraphResponseSchema.parse(json)).not.toThrow();
    expect(mockGetProjectGraphData).toHaveBeenCalledWith({
      projectId: 'proj-1',
      userId: 'user-1',
    });
  });

  it('returns 200 with full graph topology, materials, and calculated health diagnostics', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce({
      id: 'proj-1',
      name: 'Algorithms',
      userId: 'user-1',
    });

    const mockGraphData = {
      components: [
        {
          id: 'kc-1',
          name: 'Breadth-First Search',
          slug: 'bfs',
          pacerCategory: 'procedural',
          bloomLevel: 3,
        },
        {
          id: 'kc-2',
          name: 'Queue',
          slug: 'queue',
          pacerCategory: 'conceptual',
          bloomLevel: 2,
        },
        {
          id: 'kc-3',
          name: 'Graph Traversal',
          slug: 'graph-traversal',
          pacerCategory: 'conceptual',
          bloomLevel: 4,
        },
        {
          id: 'kc-4',
          name: 'Isolated Lemma',
          slug: 'isolated-lemma',
          pacerCategory: 'evidence',
          bloomLevel: 1,
        },
      ],
      dependencies: [
        {
          id: 'dep-1',
          sourceKcId: 'kc-2',
          targetKcId: 'kc-1',
          relationshipType: 'prerequisite',
        },
        {
          id: 'dep-2',
          sourceKcId: 'kc-1',
          targetKcId: 'kc-3',
          relationshipType: 'prerequisite',
        },
      ],
      materials: [
        {
          id: 'mat-1',
          title: 'Algorithms Chapter 4',
          status: 'ready',
        },
      ],
      diagnostics: {
        totalComponents: 4,
        nodeCount: 4,
        totalDependencies: 2,
        edgeCount: 2,
        orphanCount: 1, // kc-4 has no edges
        hasCycles: false,
        cyclePaths: [],
        pacerDistribution: {
          procedural: 1,
          conceptual: 2,
          analogous: 0,
          evidence: 1,
          reference: 0,
        },
        bloomDistribution: {
          1: 1,
          2: 1,
          3: 1,
          4: 1,
          5: 0,
          6: 0,
        },
      },
    };

    mockGetProjectGraphData.mockResolvedValueOnce(mockGraphData);

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph');
    const response = await GET(request, { params: Promise.resolve({ id: 'proj-1' }) });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(() => projectGraphResponseSchema.parse(json)).not.toThrow();
    expect(json.components).toHaveLength(4);
    expect(json.dependencies).toHaveLength(2);
    expect(json.materials).toHaveLength(1);
    expect(json.diagnostics.orphanCount).toBe(1);
    expect(json.diagnostics.hasCycles).toBe(false);
    expect(json.diagnostics.totalComponents).toBe(4);
    expect(json.diagnostics.nodeCount).toBe(4);
    expect(json.diagnostics.totalDependencies).toBe(2);
    expect(json.diagnostics.edgeCount).toBe(2);
    expect(json.diagnostics.pacerDistribution.conceptual).toBe(2);
    expect(json.diagnostics.bloomDistribution[3]).toBe(1);
  });
});
