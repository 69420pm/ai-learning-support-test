import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import { POST } from './route';

const mockRequireAuthUser = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  requireAuthUser: (...args: unknown[]) => mockRequireAuthUser(...args),
}));

const mockGetProjectById = vi.fn();
vi.mock('@/lib/db/queries/project', () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

const mockGetMaterialsByProjectId = vi.fn();
const mockUpdateMaterialStatus = vi.fn();
vi.mock('@/lib/db/queries/material', () => ({
  getMaterialsByProjectId: (...args: unknown[]) => mockGetMaterialsByProjectId(...args),
  updateMaterialStatus: (...args: unknown[]) => mockUpdateMaterialStatus(...args),
}));

const mockSendConceptGraphExtractJob = vi.fn();
vi.mock('@/lib/queue/boss', () => ({
  sendConceptGraphExtractJob: (...args: unknown[]) => mockSendConceptGraphExtractJob(...args),
}));

describe('POST /api/projects/[id]/graph/extract', () => {
  const defaultUser = { id: 'user-1', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when unauthenticated', async () => {
    mockRequireAuthUser.mockRejectedValueOnce(new ChatbotError('unauthorized:chat'));

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialIds: ['mat-1'] }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.code).toBe('unauthorized:chat');
  });

  it('returns 404 when project does not exist for user', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce(null);

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialIds: ['mat-1'] }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

    expect(response.status).toBe(404);
    expect(mockGetProjectById).toHaveBeenCalledWith({ id: 'proj-1', userId: 'user-1' });
  });

  it('returns 400 when specified material does not belong to project', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', name: 'CS101', userId: 'user-1' });
    mockGetMaterialsByProjectId.mockResolvedValueOnce([
      { id: 'mat-other', projectId: 'proj-1', status: 'ready', metadata: {} },
    ]);

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialIds: ['mat-not-in-project'] }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

    expect(response.status).toBe(400);
  });

  it('enqueues graph extraction for single material and returns 202', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', name: 'CS101', userId: 'user-1' });
    mockGetMaterialsByProjectId.mockResolvedValueOnce([
      { id: 'mat-1', projectId: 'proj-1', status: 'ready', metadata: {} },
    ]);
    mockSendConceptGraphExtractJob.mockResolvedValueOnce('job-xyz');

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialIds: ['mat-1'] }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

    expect(response.status).toBe(202);
    const json = await response.json();
    expect(json).toEqual({
      enqueued: true,
      materialCount: 1,
      jobId: 'job-xyz',
    });

    // Verify status updated to queued
    expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'mat-1',
        metadata: expect.objectContaining({
          graphExtraction: expect.objectContaining({
            status: 'queued',
            jobId: 'job-xyz',
          }),
        }),
      }),
    );

    // Verify job dispatched
    expect(mockSendConceptGraphExtractJob).toHaveBeenCalledWith({
      projectId: 'proj-1',
      userId: 'user-1',
      materialIds: ['mat-1'],
    });
  });

  it('supports single materialId parameter format', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', name: 'CS101', userId: 'user-1' });
    mockGetMaterialsByProjectId.mockResolvedValueOnce([
      { id: 'mat-2', projectId: 'proj-1', status: 'ready', metadata: {} },
    ]);
    mockSendConceptGraphExtractJob.mockResolvedValueOnce('job-abc');

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ materialId: 'mat-2' }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

    expect(response.status).toBe(202);
    const json = await response.json();
    expect(json.materialCount).toBe(1);
    expect(json.jobId).toBe('job-abc');
  });

  it('defaults to all ready materials in project when materialIds is omitted', async () => {
    mockRequireAuthUser.mockResolvedValueOnce(defaultUser);
    mockGetProjectById.mockResolvedValueOnce({ id: 'proj-1', name: 'CS101', userId: 'user-1' });
    mockGetMaterialsByProjectId.mockResolvedValueOnce([
      { id: 'mat-1', projectId: 'proj-1', status: 'ready', metadata: {} },
      { id: 'mat-2', projectId: 'proj-1', status: 'ready', metadata: {} },
      { id: 'mat-3', projectId: 'proj-1', status: 'processing', metadata: {} }, // Not ready
    ]);
    mockSendConceptGraphExtractJob.mockResolvedValueOnce('job-all');

    const request = new Request('http://localhost:3000/api/projects/proj-1/graph/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'proj-1' }) });

    expect(response.status).toBe(202);
    const json = await response.json();
    expect(json.materialCount).toBe(2);
    expect(mockSendConceptGraphExtractJob).toHaveBeenCalledWith({
      projectId: 'proj-1',
      userId: 'user-1',
      materialIds: ['mat-1', 'mat-2'],
    });
  });
});
