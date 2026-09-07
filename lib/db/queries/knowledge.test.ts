import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getKnowledgeComponentsByProjectId,
  getKnowledgeDependenciesByProjectId,
  insertExercises,
  insertKnowledgeDependencies,
  upsertKnowledgeComponents,
} from './knowledge';

const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockDbInsert(...args),
    select: (...args: unknown[]) => mockDbSelect(...args),
  },
}));

describe('Knowledge Graph DB Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('upsertKnowledgeComponents', () => {
    it('returns empty array when input is empty', async () => {
      const result = await upsertKnowledgeComponents([]);
      expect(result).toEqual([]);
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('performs insert with onConflictDoUpdate on (projectId, slug)', async () => {
      const mockReturning = vi.fn().mockResolvedValueOnce([
        {
          id: 'kc-1',
          projectId: 'proj-1',
          userId: 'user-1',
          slug: 'graphs',
          name: 'Graphs',
          pacerCategory: 'conceptual',
          bloomLevel: 2,
          aliases: [],
          status: 'active',
          orderIndex: 0,
        },
      ]);
      const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
      mockDbInsert.mockReturnValue({ values: mockValues });

      const result = await upsertKnowledgeComponents([
        {
          projectId: 'proj-1',
          userId: 'user-1',
          slug: 'graphs',
          name: 'Graphs',
          pacerCategory: 'conceptual',
          bloomLevel: 2,
          aliases: [],
        },
      ]);

      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      expect(mockValues).toHaveBeenCalledTimes(1);
      expect(mockOnConflictDoUpdate).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('graphs');
    });
  });

  describe('insertKnowledgeDependencies', () => {
    it('returns empty array when input is empty', async () => {
      const result = await insertKnowledgeDependencies([]);
      expect(result).toEqual([]);
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('inserts dependencies with onConflictDoNothing', async () => {
      const mockReturning = vi.fn().mockResolvedValueOnce([
        {
          id: 'kd-1',
          projectId: 'proj-1',
          sourceKcId: 'kc-1',
          targetKcId: 'kc-2',
          relationshipType: 'prerequisite',
          reasoning: 'Fundamental concept',
          isTransitive: false,
        },
      ]);
      const mockOnConflictDoNothing = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockValues = vi.fn().mockReturnValue({ onConflictDoNothing: mockOnConflictDoNothing });
      mockDbInsert.mockReturnValue({ values: mockValues });

      const result = await insertKnowledgeDependencies([
        {
          projectId: 'proj-1',
          sourceKcId: 'kc-1',
          targetKcId: 'kc-2',
          relationshipType: 'prerequisite',
          reasoning: 'Fundamental concept',
        },
      ]);

      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      expect(mockOnConflictDoNothing).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });
  });

  describe('getKnowledgeComponentsByProjectId', () => {
    it('selects knowledge components for a project ordered by orderIndex and name', async () => {
      const mockOrderBy = vi.fn().mockResolvedValueOnce([{ id: 'kc-1', slug: 'bfs' }]);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDbSelect.mockReturnValue({ from: mockFrom });

      const result = await getKnowledgeComponentsByProjectId({ projectId: 'proj-1' });

      expect(mockDbSelect).toHaveBeenCalledTimes(1);
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ id: 'kc-1', slug: 'bfs' }]);
    });
  });

  describe('getKnowledgeDependenciesByProjectId', () => {
    it('selects knowledge dependencies for a project', async () => {
      const mockWhere = vi
        .fn()
        .mockResolvedValueOnce([{ id: 'kd-1', relationshipType: 'prerequisite' }]);
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDbSelect.mockReturnValue({ from: mockFrom });

      const result = await getKnowledgeDependenciesByProjectId({ projectId: 'proj-1' });

      expect(mockDbSelect).toHaveBeenCalledTimes(1);
      expect(mockWhere).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ id: 'kd-1', relationshipType: 'prerequisite' }]);
    });
  });

  describe('insertExercises', () => {
    it('returns empty array when input is empty', async () => {
      const result = await insertExercises([]);
      expect(result).toEqual([]);
      expect(mockDbInsert).not.toHaveBeenCalled();
    });

    it('inserts exercises and returns created records', async () => {
      const mockReturning = vi.fn().mockResolvedValueOnce([
        {
          id: 'ex-1',
          projectId: 'proj-1',
          userId: 'user-1',
          materialId: 'mat-1',
          kcId: 'kc-1',
          pageNumber: 5,
          title: 'Problem 1',
          prompt: 'Solve 2x=4',
          solution: 'x=2',
          questionType: 'calculation',
          difficulty: 2,
        },
      ]);
      const mockValues = vi.fn().mockReturnValue({ returning: mockReturning });
      mockDbInsert.mockReturnValue({ values: mockValues });

      const result = await insertExercises([
        {
          projectId: 'proj-1',
          userId: 'user-1',
          materialId: 'mat-1',
          kcId: 'kc-1',
          pageNumber: 5,
          title: 'Problem 1',
          prompt: 'Solve 2x=4',
          solution: 'x=2',
          questionType: 'calculation',
          difficulty: 2,
        },
      ]);

      expect(mockDbInsert).toHaveBeenCalledTimes(1);
      expect(mockValues).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('ex-1');
      expect(result[0].pageNumber).toBe(5);
    });
  });
});
