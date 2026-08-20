import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import {
  createProject,
  deleteProjectById,
  getProjectById,
  getProjectsByUserId,
  getProjectsWithChatCount,
  updateProjectName,
} from './project';

// Mock Drizzle DB instance
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('Project DB Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createProject', () => {
    it('creates and returns a new project record', async () => {
      const mockProject = {
        id: 'project-uuid-1',
        name: 'Linear Algebra',
        userId: 'user-uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([mockProject]),
        }),
      });

      const result = await createProject({
        name: 'Linear Algebra',
        userId: 'user-uuid-1',
      });

      expect(result).toEqual(mockProject);
    });

    it('throws ChatbotError on failure', async () => {
      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockRejectedValueOnce(new Error('DB Unique Error')),
        }),
      });

      await expect(
        createProject({
          name: 'Linear Algebra',
          userId: 'user-uuid-1',
        }),
      ).rejects.toThrow(ChatbotError);
    });
  });

  describe('getProjectsByUserId', () => {
    it('returns projects ordered by updatedAt desc', async () => {
      const mockProjects = [
        {
          id: 'proj-1',
          name: 'Math',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockResolvedValueOnce(mockProjects),
          }),
        }),
      });

      const result = await getProjectsByUserId({ userId: 'user-1' });
      expect(result).toEqual(mockProjects);
    });
  });

  describe('getProjectById', () => {
    it('returns a project by id and userId', async () => {
      const mockProject = {
        id: 'proj-1',
        name: 'Math',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockProject]),
        }),
      });

      const result = await getProjectById({ id: 'proj-1', userId: 'user-1' });
      expect(result).toEqual(mockProject);
    });

    it('returns null when not found', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const result = await getProjectById({ id: 'non-existent', userId: 'user-1' });
      expect(result).toBeNull();
    });
  });

  describe('updateProjectName', () => {
    it('updates and returns the project', async () => {
      const updatedProject = {
        id: 'proj-1',
        name: 'Advanced Math',
        userId: 'user-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([updatedProject]),
          }),
        }),
      });

      const result = await updateProjectName({
        id: 'proj-1',
        userId: 'user-1',
        name: 'Advanced Math',
      });

      expect(result).toEqual(updatedProject);
    });
  });

  describe('deleteProjectById', () => {
    it('deletes and returns the deleted project', async () => {
      const deletedProject = {
        id: 'proj-1',
        name: 'Math',
        userId: 'user-1',
      };

      mockDelete.mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([deletedProject]),
        }),
      });

      const result = await deleteProjectById({ id: 'proj-1', userId: 'user-1' });
      expect(result).toEqual(deletedProject);
    });
  });

  describe('getProjectsWithChatCount', () => {
    it('returns projects with aggregated chat count', async () => {
      const mockResult = [
        {
          id: 'proj-1',
          name: 'Math',
          userId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          chatCount: 3,
        },
      ];

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          leftJoin: vi.fn().mockReturnValueOnce({
            where: vi.fn().mockReturnValueOnce({
              groupBy: vi.fn().mockReturnValueOnce({
                orderBy: vi.fn().mockResolvedValueOnce(mockResult),
              }),
            }),
          }),
        }),
      });

      const result = await getProjectsWithChatCount({ userId: 'user-1' });
      expect(result).toEqual(mockResult);
    });
  });
});
