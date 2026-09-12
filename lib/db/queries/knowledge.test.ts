import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupMaterialExtractedGraph,
  getActiveProjectConceptNames,
  getExercisesForKc,
  getGraphNeighborhood,
  getKnowledgeComponentDeepInspection,
  getKnowledgeComponentsByProjectId,
  getKnowledgeDependenciesByProjectId,
  getPrerequisiteChain,
  getReadyToLearnFrontier,
  insertExercises,
  insertKnowledgeDependencies,
  upsertKnowledgeComponents,
} from './knowledge';

const mockDbInsert = vi.fn();
const mockDbSelect = vi.fn();
const mockDbDelete = vi.fn();
const mockDbTransaction = vi.fn();
const mockDbExecute = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockDbInsert(...args),
    select: (...args: unknown[]) => mockDbSelect(...args),
    delete: (...args: unknown[]) => mockDbDelete(...args),
    transaction: (...args: unknown[]) => mockDbTransaction(...args),
    execute: (...args: unknown[]) => mockDbExecute(...args),
  },
}));

function extractChunkText(c: unknown): string {
  if (typeof c === 'string') return c;
  if (!c || typeof c !== 'object') return '';
  if ('queryChunks' in c && Array.isArray((c as { queryChunks: unknown[] }).queryChunks)) {
    return (c as { queryChunks: unknown[] }).queryChunks.map(extractChunkText).join(' ');
  }
  if ('value' in c) {
    const val = (c as { value: unknown }).value;
    return Array.isArray(val) ? val.join(' ') : String(val);
  }
  if ('name' in c) {
    return String((c as { name: unknown }).name);
  }
  return '';
}

function getSqlString(sqlObj: { queryChunks?: unknown[] }): string {
  return sqlObj.queryChunks?.map(extractChunkText).join(' ') ?? '';
}

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

    it('merges aliases via deduplicated jsonb set union and updates bloomLevel to GREATEST on conflict', async () => {
      const mockReturning = vi.fn().mockResolvedValueOnce([]);
      const mockOnConflictDoUpdate = vi.fn().mockReturnValue({ returning: mockReturning });
      const mockValues = vi.fn().mockReturnValue({ onConflictDoUpdate: mockOnConflictDoUpdate });
      mockDbInsert.mockReturnValue({ values: mockValues });

      await upsertKnowledgeComponents([
        {
          projectId: 'proj-1',
          userId: 'user-1',
          slug: 'trees',
          name: 'Trees',
          pacerCategory: 'conceptual',
          bloomLevel: 3,
          aliases: ['B-Tree'],
        },
      ]);

      const conflictUpdateArg = mockOnConflictDoUpdate.mock.calls[0][0];
      const setClauses = conflictUpdateArg.set;

      const bloomLevelSql = getSqlString(setClauses.bloomLevel);
      const aliasesSql = getSqlString(setClauses.aliases);

      expect(bloomLevelSql).toContain('GREATEST');
      expect(aliasesSql).toContain('jsonb_agg(DISTINCT elem)');
      expect(aliasesSql).toContain('jsonb_array_elements_text');
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

  describe('getActiveProjectConceptNames', () => {
    it('returns active concept names ordered by updatedAt desc', async () => {
      const mockLimit = vi
        .fn()
        .mockResolvedValueOnce([{ name: 'Binary Search' }, { name: 'Linear Search' }]);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDbSelect.mockReturnValue({ from: mockFrom });

      const result = await getActiveProjectConceptNames({ projectId: 'proj-1' });

      expect(mockDbSelect).toHaveBeenCalledTimes(1);
      expect(mockLimit).toHaveBeenCalledWith(501);
      expect(result).toEqual(['Binary Search', 'Linear Search']);
    });

    it('limits to 500 concepts and logs warning when active concepts exceed 500', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {
        // no-op mock for warning in test
      });
      const manyConcepts = Array.from({ length: 501 }, (_, i) => ({
        name: `Concept ${i + 1}`,
      }));

      const mockLimit = vi.fn().mockResolvedValueOnce(manyConcepts);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDbSelect.mockReturnValue({ from: mockFrom });

      const result = await getActiveProjectConceptNames({ projectId: 'proj-1', limit: 500 });

      expect(result).toHaveLength(500);
      expect(result[0]).toBe('Concept 1');
      expect(result[499]).toBe('Concept 500');
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('active concepts exceeding limit of 500'),
      );
      warnSpy.mockRestore();
    });
  });

  describe('cleanupMaterialExtractedGraph', () => {
    it('atomically deletes exercises and material-attributed dependencies in a transaction', async () => {
      const mockTxDelete = vi.fn();
      const mockTxWhere = vi.fn().mockResolvedValue(undefined);
      mockTxDelete.mockReturnValue({ where: mockTxWhere });

      const mockTx = {
        delete: mockTxDelete,
      };

      mockDbTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) => {
        return await callback(mockTx);
      });

      await cleanupMaterialExtractedGraph({
        materialId: 'mat-1',
        projectId: 'proj-1',
      });

      expect(mockDbTransaction).toHaveBeenCalledTimes(1);
      expect(mockTxDelete).toHaveBeenCalledTimes(2);
    });
  });

  describe('getGraphNeighborhood', () => {
    it('returns null concept and empty lists when concept does not exist in project', async () => {
      const mockLimit = vi.fn().mockResolvedValueOnce([]);
      const mockWhere = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDbSelect.mockReturnValue({ from: mockFrom });

      const result = await getGraphNeighborhood('proj-1', '550e8400-e29b-41d4-a716-446655440000');

      expect(result).toEqual({
        concept: null,
        prerequisites: [],
        unlocked: [],
        depth: 1,
      });
    });

    it('retrieves 1-hop prerequisites and unlocked concepts with tenant isolation', async () => {
      const centralConcept = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        projectId: 'proj-1',
        slug: 'binary-search',
        name: 'Binary Search',
        pacerCategory: 'procedural',
        bloomLevel: 3,
        aliases: [],
      };
      const prereqConcept = {
        id: '11111111-1111-1111-1111-111111111111',
        projectId: 'proj-1',
        slug: 'sorted-arrays',
        name: 'Sorted Arrays',
        pacerCategory: 'conceptual',
        bloomLevel: 2,
        aliases: [],
      };
      const unlockedConcept = {
        id: '22222222-2222-2222-2222-222222222222',
        projectId: 'proj-1',
        slug: 'binary-search-tree',
        name: 'Binary Search Tree',
        pacerCategory: 'conceptual',
        bloomLevel: 3,
        aliases: [],
      };

      // 1st select: find target concept
      const mockLimit = vi.fn().mockResolvedValueOnce([centralConcept]);
      const mockWhereTarget = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockFromTarget = vi.fn().mockReturnValue({ where: mockWhereTarget });

      // 2nd select: prerequisites (targetKcId = centralConcept.id)
      const mockWherePrereqs = vi.fn().mockResolvedValueOnce([
        {
          concept: prereqConcept,
          dependency: {
            relationshipType: 'prerequisite',
            reasoning: 'Need sorted data',
          },
        },
      ]);
      const mockInnerJoinPrereqs = vi.fn().mockReturnValue({ where: mockWherePrereqs });
      const mockFromPrereqs = vi.fn().mockReturnValue({ innerJoin: mockInnerJoinPrereqs });

      // 3rd select: unlocked (sourceKcId = centralConcept.id)
      const mockWhereUnlocked = vi.fn().mockResolvedValueOnce([
        {
          concept: unlockedConcept,
          dependency: {
            relationshipType: 'prerequisite',
            reasoning: 'BST builds on binary search principles',
          },
        },
      ]);
      const mockInnerJoinUnlocked = vi.fn().mockReturnValue({ where: mockWhereUnlocked });
      const mockFromUnlocked = vi.fn().mockReturnValue({ innerJoin: mockInnerJoinUnlocked });

      mockDbSelect
        .mockReturnValueOnce({ from: mockFromTarget })
        .mockReturnValueOnce({ from: mockFromPrereqs })
        .mockReturnValueOnce({ from: mockFromUnlocked });

      const result = await getGraphNeighborhood('proj-1', centralConcept.id, 1);

      expect(result.concept).toEqual(centralConcept);
      expect(result.depth).toBe(1);
      expect(result.prerequisites).toEqual([
        {
          ...prereqConcept,
          depth: 1,
          relationshipType: 'prerequisite',
          reasoning: 'Need sorted data',
        },
      ]);
      expect(result.unlocked).toEqual([
        {
          ...unlockedConcept,
          depth: 1,
          relationshipType: 'prerequisite',
          reasoning: 'BST builds on binary search principles',
        },
      ]);
    });

    it('expands to 2-hop neighbors recursively when depth = 2 and deduplicates visited nodes', async () => {
      const centralConcept = {
        id: 'c-0',
        projectId: 'proj-1',
        slug: 'c-0',
        name: 'Concept 0',
      };
      const hop1Prereq = {
        id: 'p-1',
        projectId: 'proj-1',
        slug: 'p-1',
        name: 'Hop 1 Prereq',
      };
      const hop2Prereq = {
        id: 'p-2',
        projectId: 'proj-1',
        slug: 'p-2',
        name: 'Hop 2 Prereq',
      };
      const hop1Unlocked = {
        id: 'u-1',
        projectId: 'proj-1',
        slug: 'u-1',
        name: 'Hop 1 Unlocked',
      };
      const hop2Unlocked = {
        id: 'u-2',
        projectId: 'proj-1',
        slug: 'u-2',
        name: 'Hop 2 Unlocked',
      };

      // 1. Concept lookup
      const mockLimit = vi.fn().mockResolvedValueOnce([centralConcept]);
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: mockLimit }) }),
      });

      // 2. 1-hop prereqs
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([
              {
                concept: hop1Prereq,
                dependency: { relationshipType: 'prerequisite', reasoning: 'p1 reason' },
              },
            ]),
          }),
        }),
      });

      // 3. 1-hop unlocked
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([
              {
                concept: hop1Unlocked,
                dependency: { relationshipType: 'prerequisite', reasoning: 'u1 reason' },
              },
            ]),
          }),
        }),
      });

      // 4. 2-hop prereqs (targetKcId in [p-1])
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([
              {
                concept: hop2Prereq,
                dependency: { relationshipType: 'prerequisite', reasoning: 'p2 reason' },
              },
            ]),
          }),
        }),
      });

      // 5. 2-hop unlocked (sourceKcId in [u-1])
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValueOnce([
              {
                concept: hop2Unlocked,
                dependency: { relationshipType: 'prerequisite', reasoning: 'u2 reason' },
              },
            ]),
          }),
        }),
      });

      const result = await getGraphNeighborhood({
        projectId: 'proj-1',
        kcId: 'c-0',
        depth: 2,
      });

      expect(result.depth).toBe(2);
      expect(result.prerequisites).toHaveLength(2);
      expect(result.prerequisites[0]).toMatchObject({ id: 'p-1', depth: 1 });
      expect(result.prerequisites[1]).toMatchObject({ id: 'p-2', depth: 2 });
      expect(result.unlocked).toHaveLength(2);
      expect(result.unlocked[0]).toMatchObject({ id: 'u-1', depth: 1 });
      expect(result.unlocked[1]).toMatchObject({ id: 'u-2', depth: 2 });
    });
  });

  describe('getPrerequisiteChain', () => {
    it('returns empty array when concept does not exist in project', async () => {
      const mockLimit = vi.fn().mockResolvedValueOnce([]);
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: mockLimit }) }),
      });

      const result = await getPrerequisiteChain('proj-1', 'non-existent');
      expect(result).toEqual([]);
      expect(mockDbExecute).not.toHaveBeenCalled();
    });

    it('executes recursive CTE query with cycle guard and returns ordered ancestors', async () => {
      const targetConcept = {
        id: '33333333-3333-3333-3333-333333333333',
        projectId: 'proj-1',
        slug: 'dijkstra',
      };

      const mockLimit = vi.fn().mockResolvedValueOnce([targetConcept]);
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: mockLimit }) }),
      });

      const ancestorRows = [
        {
          id: '22222222-2222-2222-2222-222222222222',
          projectId: 'proj-1',
          slug: 'bfs',
          name: 'Breadth-First Search',
          pacerCategory: 'procedural',
          bloomLevel: 3,
          aliases: [],
          status: 'active',
          orderIndex: 2,
          depth: 1,
          relationshipType: 'prerequisite',
          reasoning: 'Graph traversal foundation',
        },
        {
          id: '11111111-1111-1111-1111-111111111111',
          projectId: 'proj-1',
          slug: 'graphs',
          name: 'Graphs',
          pacerCategory: 'conceptual',
          bloomLevel: 2,
          aliases: [],
          status: 'active',
          orderIndex: 1,
          depth: 2,
          relationshipType: 'prerequisite',
          reasoning: 'Core graph representation',
        },
      ];

      mockDbExecute.mockResolvedValueOnce(ancestorRows);

      const chain = await getPrerequisiteChain('proj-1', targetConcept.id, 10);

      expect(chain).toEqual(ancestorRows);
      expect(mockDbExecute).toHaveBeenCalledTimes(1);

      // Verify that the SQL query includes recursive CTE and cycle guard
      const executedSql = mockDbExecute.mock.calls[0][0];
      const sqlString = getSqlString(executedSql);
      expect(sqlString.toLowerCase()).toContain('recursive');
      expect(sqlString.toLowerCase()).toContain('visited_path');
      expect(sqlString).toContain('ANY');
    });

    it('supports object options signature { projectId, kcId, maxDepth }', async () => {
      const targetConcept = {
        id: '33333333-3333-3333-3333-333333333333',
        projectId: 'proj-1',
      };

      const mockLimit = vi.fn().mockResolvedValueOnce([targetConcept]);
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: mockLimit }) }),
      });

      mockDbExecute.mockResolvedValueOnce([]);

      const chain = await getPrerequisiteChain({
        projectId: 'proj-1',
        kcId: targetConcept.id,
        maxDepth: 5,
      });

      expect(chain).toEqual([]);
      expect(mockDbExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('getReadyToLearnFrontier', () => {
    it('returns empty array when projectId is empty', async () => {
      const result = await getReadyToLearnFrontier('', []);
      expect(result).toEqual([]);
      expect(mockDbExecute).not.toHaveBeenCalled();
    });

    it('retrieves root foundational concepts with default masteredKcIds = []', async () => {
      const rootConcepts = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          projectId: 'proj-1',
          name: 'Arrays',
          slug: 'arrays',
          status: 'active',
          orderIndex: 0,
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          projectId: 'proj-1',
          name: 'Variables',
          slug: 'variables',
          status: 'active',
          orderIndex: 1,
        },
      ];

      mockDbExecute.mockResolvedValueOnce(rootConcepts);

      const result = await getReadyToLearnFrontier('proj-1');

      expect(result).toEqual(rootConcepts);
      expect(mockDbExecute).toHaveBeenCalledTimes(1);

      const executedSql = mockDbExecute.mock.calls[0][0];
      const sqlString = getSqlString(executedSql);
      expect(sqlString).toContain('status');
      expect(sqlString).toContain('active');
      expect(sqlString).toContain('NOT EXISTS');
    });

    it('unblocks concepts when prerequisite concepts are passed in masteredKcIds', async () => {
      const masteredId = '11111111-1111-1111-1111-111111111111';
      const unblockedConcepts = [
        {
          id: '33333333-3333-3333-3333-333333333333',
          projectId: 'proj-1',
          name: 'Binary Search',
          slug: 'binary-search',
          status: 'active',
          orderIndex: 2,
        },
      ];

      mockDbExecute.mockResolvedValueOnce(unblockedConcepts);

      const result = await getReadyToLearnFrontier('proj-1', [masteredId]);

      expect(result).toEqual(unblockedConcepts);
      expect(mockDbExecute).toHaveBeenCalledTimes(1);

      const executedSql = mockDbExecute.mock.calls[0][0];
      const sqlString = getSqlString(executedSql);
      expect(sqlString).toContain('ANY');
    });

    it('excludes concepts that are already in masteredKcIds', async () => {
      const masteredId = '11111111-1111-1111-1111-111111111111';
      mockDbExecute.mockResolvedValueOnce([]);

      const result = await getReadyToLearnFrontier({
        projectId: 'proj-1',
        masteredKcIds: [masteredId],
      });

      expect(result).toEqual([]);
      expect(mockDbExecute).toHaveBeenCalledTimes(1);

      const executedSql = mockDbExecute.mock.calls[0][0];
      const sqlString = getSqlString(executedSql);
      // The SQL query should filter out mastered concepts: NOT (kc.id ... = ANY(...))
      expect(sqlString).toContain('NOT');
      expect(sqlString).toContain('ANY');
    });
  });

  describe('getExercisesForKc', () => {
    it('returns empty array when projectId or kcId is empty', async () => {
      expect(await getExercisesForKc('', 'kc-1')).toEqual([]);
      expect(await getExercisesForKc('proj-1', '')).toEqual([]);
      expect(mockDbSelect).not.toHaveBeenCalled();
    });

    it('returns empty array when concept does not exist in project (tenant isolation)', async () => {
      const mockLimit = vi.fn().mockResolvedValueOnce([]);
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: mockLimit }) }),
      });

      const result = await getExercisesForKc('proj-1', 'non-existent-slug');
      expect(result).toEqual([]);
    });

    it('returns exercises directly via WHERE project_id = $1 AND kc_id = $2 without join overhead', async () => {
      const resolvedConcept = {
        id: '11111111-1111-1111-1111-111111111111',
        projectId: 'proj-1',
        slug: 'binary-search',
        name: 'Binary Search',
      };
      const expectedExercises = [
        {
          id: 'ex-1',
          projectId: 'proj-1',
          userId: 'user-1',
          materialId: 'mat-1',
          kcId: resolvedConcept.id,
          pageNumber: 42,
          title: 'Problem 4.2: Peak Element',
          prompt: 'Find a peak element in an array in O(log n) time.',
          solution: 'Apply binary search on middle elements.',
          questionType: 'code',
          difficulty: 3,
        },
      ];

      // 1st select: resolveConcept
      const mockLimit = vi.fn().mockResolvedValueOnce([resolvedConcept]);
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: mockLimit }) }),
      });

      // 2nd select: getExercisesForKc directly from exercises
      const mockOrderBy = vi.fn().mockResolvedValueOnce(expectedExercises);
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      const mockFrom = vi.fn().mockReturnValue({ where: mockWhere });
      mockDbSelect.mockReturnValueOnce({ from: mockFrom });

      const result = await getExercisesForKc('proj-1', resolvedConcept.id);

      expect(result).toEqual(expectedExercises);
      expect(mockDbSelect).toHaveBeenCalledTimes(2);
      expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('supports object options signature { projectId, kcId }', async () => {
      const resolvedConcept = {
        id: '11111111-1111-1111-1111-111111111111',
        projectId: 'proj-1',
        slug: 'recursion',
      };
      mockDbSelect
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi
              .fn()
              .mockReturnValue({ limit: vi.fn().mockResolvedValueOnce([resolvedConcept]) }),
          }),
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({ orderBy: vi.fn().mockResolvedValueOnce([]) }),
          }),
        });

      const result = await getExercisesForKc({ projectId: 'proj-1', kcId: 'recursion' });
      expect(result).toEqual([]);
      expect(mockDbSelect).toHaveBeenCalledTimes(2);
    });
  });

  describe('getKnowledgeComponentDeepInspection', () => {
    it('returns null when concept does not exist in project', async () => {
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      const result = await getKnowledgeComponentDeepInspection({
        projectId: 'proj-1',
        kcId: 'non-existent',
      });

      expect(result).toBeNull();
    });

    it('returns concept, exercises, and scoped originating chunks with limit when concept exists', async () => {
      const mockConcept = {
        id: 'kc-1',
        projectId: 'proj-1',
        name: 'Graph Traversal',
        slug: 'graph-traversal',
        sourceMaterialId: 'mat-1',
        pacerCategory: 'procedural',
        bloomLevel: 3,
      };

      const mockExercises = [
        {
          id: 'ex-1',
          projectId: 'proj-1',
          kcId: 'kc-1',
          materialId: 'mat-1',
          title: 'BFS Exercise',
          pageNumber: 15,
        },
      ];

      const mockChunks = [
        {
          id: 'chunk-1',
          projectId: 'proj-1',
          materialId: 'mat-1',
          chunkIndex: 1,
          content: 'Excerpts describing graph traversal algorithms...',
          metadata: { pageNumber: 15 },
        },
      ];

      // 1. resolveConcept: select from knowledgeComponents
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([mockConcept]),
          }),
        }),
      });

      // 2. resolveConcept inside getExercisesForKc: select from knowledgeComponents
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([mockConcept]),
          }),
        }),
      });

      // 3. getExercisesForKc: select from exercises
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValueOnce(mockExercises),
          }),
        }),
      });

      // 4. chunks: select from materialChunks with limit
      const mockLimit = vi.fn().mockResolvedValueOnce(mockChunks);
      const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit });
      const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: mockWhere }),
      });

      const result = await getKnowledgeComponentDeepInspection({
        projectId: 'proj-1',
        kcId: 'graph-traversal',
      });

      expect(result).not.toBeNull();
      expect(result?.component).toEqual(mockConcept);
      expect(result?.exercises).toEqual(mockExercises);
      expect(result?.chunks).toEqual(mockChunks);
      expect(mockLimit).toHaveBeenCalledWith(50);
    });

    it('returns empty chunks array if concept has no sourceMaterialId', async () => {
      const mockConcept = {
        id: 'kc-2',
        projectId: 'proj-1',
        name: 'Manual Concept',
        slug: 'manual-concept',
        sourceMaterialId: null,
        pacerCategory: 'conceptual',
        bloomLevel: 2,
      };

      // 1. resolveConcept
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([mockConcept]),
          }),
        }),
      });

      // 2. resolveConcept inside getExercisesForKc
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValueOnce([mockConcept]),
          }),
        }),
      });

      // 3. exercises
      mockDbSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      const result = await getKnowledgeComponentDeepInspection({
        projectId: 'proj-1',
        kcId: 'manual-concept',
      });

      expect(result).not.toBeNull();
      expect(result?.component).toEqual(mockConcept);
      expect(result?.exercises).toEqual([]);
      expect(result?.chunks).toEqual([]);
    });
  });
});
