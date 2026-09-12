import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import { requireProjectContext } from './project-context';

const mockRequireAuthUser = vi.fn();
vi.mock('@/lib/auth/session', () => ({
  requireAuthUser: (...args: unknown[]) => mockRequireAuthUser(...args),
}));

const mockGetProjectById = vi.fn();
vi.mock('@/lib/db/queries/project', () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

describe('Project Context Resolution (lib/auth/project-context.ts)', () => {
  const defaultUser = {
    id: '11111111-1111-1111-1111-111111111111',
    email: 'user@example.com',
  };
  const defaultProject = {
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Mathematics',
    userId: defaultUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuthUser.mockResolvedValue(defaultUser);
    mockGetProjectById.mockResolvedValue(defaultProject);
  });

  it('resolves project context from params Promise', async () => {
    const params = Promise.resolve({ id: defaultProject.id });
    const result = await requireProjectContext(params);

    expect(result).toEqual({
      project: defaultProject,
      user: defaultUser,
      projectId: defaultProject.id,
    });
    expect(mockRequireAuthUser).toHaveBeenCalledTimes(1);
    expect(mockGetProjectById).toHaveBeenCalledWith({
      id: defaultProject.id,
      userId: defaultUser.id,
    });
  });

  it('resolves project context from plain params object', async () => {
    const result = await requireProjectContext({ id: defaultProject.id });

    expect(result.project).toEqual(defaultProject);
    expect(result.projectId).toBe(defaultProject.id);
  });

  it('resolves project context when projectId is provided directly with userId', async () => {
    const result = await requireProjectContext(defaultProject.id, defaultUser.id);

    expect(result.project).toEqual(defaultProject);
    expect(mockGetProjectById).toHaveBeenCalledWith({
      id: defaultProject.id,
      userId: defaultUser.id,
    });
  });

  it('resolves project context when projectId is provided directly without userId (authenticates user)', async () => {
    const result = await requireProjectContext(defaultProject.id);

    expect(result.project).toEqual(defaultProject);
    expect(mockRequireAuthUser).toHaveBeenCalled();
    expect(mockGetProjectById).toHaveBeenCalledWith({
      id: defaultProject.id,
      userId: defaultUser.id,
    });
  });

  it('throws unauthorized when user authentication fails', async () => {
    mockRequireAuthUser.mockRejectedValueOnce(new ChatbotError('unauthorized:chat'));

    await expect(requireProjectContext({ id: defaultProject.id })).rejects.toThrow(ChatbotError);
    expect(mockGetProjectById).not.toHaveBeenCalled();
  });

  it('throws bad_request:api when project ID is missing or whitespace', async () => {
    await expect(requireProjectContext({ id: '   ' })).rejects.toThrow(
      expect.objectContaining({
        type: 'bad_request',
        surface: 'api',
      }),
    );

    await expect(requireProjectContext(Promise.resolve({ id: '' }))).rejects.toThrow(ChatbotError);
  });

  it('throws not_found:chat when project is not found for user', async () => {
    mockGetProjectById.mockResolvedValueOnce(null);

    await expect(requireProjectContext({ id: 'non-existent' })).rejects.toThrow(
      expect.objectContaining({
        type: 'not_found',
        surface: 'chat',
      }),
    );
  });
});
