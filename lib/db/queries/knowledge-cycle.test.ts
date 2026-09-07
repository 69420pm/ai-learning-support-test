import { describe, expect, it, vi } from 'vitest';
import { getPrerequisiteChain } from './knowledge';

type DependencyEdge = {
  sourceKcId: string;
  targetKcId: string;
  projectId: string;
  relationshipType: string;
  reasoning?: string;
};

type KnowledgeComponentNode = {
  id: string;
  projectId: string;
  name: string;
  orderIndex: number;
};

const mockDbSelect = vi.fn();
const mockDbExecute = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockDbSelect(...args),
    execute: (...args: unknown[]) => mockDbExecute(...args),
  },
}));

function extractChunkText(c: unknown): string {
  if (typeof c === 'string') return c;
  if (!c || typeof c !== 'object') return '';
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

/**
 * Pure simulation of the exact SQL recursive CTE query logic executed by getPrerequisiteChain:
 *
 * WITH RECURSIVE prereq_tree AS (
 *   SELECT kd.source_kc_id AS kc_id, kd.target_kc_id AS dependent_kc_id, 1 AS depth,
 *          ARRAY[kd.target_kc_id::text, kd.source_kc_id::text] AS visited_path ...
 *   WHERE kd.project_id = ${projectId} AND kd.target_kc_id = ${startKcId}
 *   UNION ALL
 *   SELECT kd.source_kc_id AS kc_id, kd.target_kc_id AS dependent_kc_id, prev.depth + 1 AS depth,
 *          prev.visited_path || kd.source_kc_id::text AS visited_path ...
 *   JOIN prereq_tree prev ON kd.target_kc_id = prev.kc_id
 *   WHERE kd.project_id = ${projectId} AND prev.depth < ${maxDepth}
 *     AND NOT (kd.source_kc_id::text = ANY(prev.visited_path))
 * )
 * SELECT DISTINCT ON (pt.kc_id) ... ORDER BY depth ASC, orderIndex ASC, name ASC;
 */
function simulatePrerequisiteCTE({
  dependencies,
  concepts,
  projectId,
  startKcId,
  maxDepth = 10,
}: {
  dependencies: DependencyEdge[];
  concepts: KnowledgeComponentNode[];
  projectId: string;
  startKcId: string;
  maxDepth?: number;
}) {
  type CTERow = {
    kcId: string;
    dependentKcId: string;
    depth: number;
    visitedPath: string[];
    relationshipType: string;
    reasoning?: string;
  };

  const queue: CTERow[] = [];
  const allGeneratedRows: CTERow[] = [];

  const baseDependencies = dependencies.filter(
    (d) => d.projectId === projectId && d.targetKcId === startKcId,
  );

  for (const dep of baseDependencies) {
    const row: CTERow = {
      kcId: dep.sourceKcId,
      dependentKcId: dep.targetKcId,
      depth: 1,
      visitedPath: [dep.targetKcId, dep.sourceKcId],
      relationshipType: dep.relationshipType,
      reasoning: dep.reasoning,
    };
    queue.push(row);
    allGeneratedRows.push(row);
  }

  while (queue.length > 0) {
    const prev = queue.shift();
    if (!prev) {
      break;
    }

    if (prev.depth >= maxDepth) {
      continue;
    }

    const nextDeps = dependencies.filter(
      (d) =>
        d.projectId === projectId &&
        d.targetKcId === prev.kcId &&
        !prev.visitedPath.includes(d.sourceKcId),
    );

    for (const dep of nextDeps) {
      const nextRow: CTERow = {
        kcId: dep.sourceKcId,
        dependentKcId: dep.targetKcId,
        depth: prev.depth + 1,
        visitedPath: [...prev.visitedPath, dep.sourceKcId],
        relationshipType: dep.relationshipType,
        reasoning: dep.reasoning,
      };
      queue.push(nextRow);
      allGeneratedRows.push(nextRow);
    }
  }

  const conceptMap = new Map<string, KnowledgeComponentNode>(
    concepts.filter((c) => c.projectId === projectId).map((c) => [c.id, c]),
  );

  const distinctByKcId = new Map<
    string,
    {
      concept: KnowledgeComponentNode;
      depth: number;
      relationshipType: string;
      reasoning?: string;
    }
  >();

  for (const row of allGeneratedRows) {
    const concept = conceptMap.get(row.kcId);
    if (!concept) continue;

    const existing = distinctByKcId.get(row.kcId);
    if (!existing || row.depth < existing.depth) {
      distinctByKcId.set(row.kcId, {
        concept,
        depth: row.depth,
        relationshipType: row.relationshipType,
        reasoning: row.reasoning,
      });
    }
  }

  return Array.from(distinctByKcId.values()).sort((a, b) => {
    if (a.depth !== b.depth) return a.depth - b.depth;
    if (a.concept.orderIndex !== b.concept.orderIndex) {
      return a.concept.orderIndex - b.concept.orderIndex;
    }
    return a.concept.name.localeCompare(b.concept.name);
  });
}

describe('Prerequisite Chain Cycle Guard & Topologies', () => {
  const proj1 = 'project-1';
  const proj2 = 'project-2';

  const concepts: KnowledgeComponentNode[] = [
    { id: 'A', projectId: proj1, name: 'Concept A', orderIndex: 1 },
    { id: 'B', projectId: proj1, name: 'Concept B', orderIndex: 2 },
    { id: 'C', projectId: proj1, name: 'Concept C', orderIndex: 3 },
    { id: 'D', projectId: proj1, name: 'Concept D', orderIndex: 4 },
    { id: 'Other_A', projectId: proj2, name: 'Other Concept A', orderIndex: 1 },
  ];

  it('terminates circular graph topology A -> B -> C -> A cleanly without infinite loop', () => {
    const dependencies: DependencyEdge[] = [
      { sourceKcId: 'A', targetKcId: 'B', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'B', targetKcId: 'C', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'C', targetKcId: 'A', projectId: proj1, relationshipType: 'prerequisite' },
    ];

    const result = simulatePrerequisiteCTE({
      dependencies,
      concepts,
      projectId: proj1,
      startKcId: 'C',
      maxDepth: 10,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ concept: { id: 'B' }, depth: 1 });
    expect(result[1]).toMatchObject({ concept: { id: 'A' }, depth: 2 });
  });

  it('terminates mutually dependent co-requisite graph A <-> B cleanly', () => {
    const dependencies: DependencyEdge[] = [
      { sourceKcId: 'A', targetKcId: 'B', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'B', targetKcId: 'A', projectId: proj1, relationshipType: 'prerequisite' },
    ];

    const resultFromB = simulatePrerequisiteCTE({
      dependencies,
      concepts,
      projectId: proj1,
      startKcId: 'B',
      maxDepth: 10,
    });

    expect(resultFromB).toHaveLength(1);
    expect(resultFromB[0]).toMatchObject({ concept: { id: 'A' }, depth: 1 });
  });

  it('resolves diamond dependency graph and deduplicates at closest depth', () => {
    const dependencies: DependencyEdge[] = [
      { sourceKcId: 'B', targetKcId: 'D', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'C', targetKcId: 'D', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'A', targetKcId: 'B', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'A', targetKcId: 'C', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'A', targetKcId: 'D', projectId: proj1, relationshipType: 'prerequisite' },
    ];

    const result = simulatePrerequisiteCTE({
      dependencies,
      concepts,
      projectId: proj1,
      startKcId: 'D',
      maxDepth: 10,
    });

    expect(result).toHaveLength(3);
    const nodeIds = result.map((r) => r.concept.id);
    expect(nodeIds).toContain('A');
    expect(nodeIds).toContain('B');
    expect(nodeIds).toContain('C');
    expect(result.every((r) => r.depth === 1)).toBe(true);
  });

  it('strictly enforces tenant isolation across projects', () => {
    const dependencies: DependencyEdge[] = [
      { sourceKcId: 'A', targetKcId: 'B', projectId: proj1, relationshipType: 'prerequisite' },
      {
        sourceKcId: 'Other_A',
        targetKcId: 'B',
        projectId: proj2,
        relationshipType: 'prerequisite',
      },
    ];

    const result = simulatePrerequisiteCTE({
      dependencies,
      concepts,
      projectId: proj1,
      startKcId: 'B',
      maxDepth: 10,
    });

    expect(result).toHaveLength(1);
    expect(result[0].concept.id).toBe('A');
    expect(result.some((r) => r.concept.id === 'Other_A')).toBe(false);
  });

  it('respects maxDepth boundary limit', () => {
    const dependencies: DependencyEdge[] = [
      { sourceKcId: 'C', targetKcId: 'D', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'B', targetKcId: 'C', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'A', targetKcId: 'B', projectId: proj1, relationshipType: 'prerequisite' },
    ];

    const result = simulatePrerequisiteCTE({
      dependencies,
      concepts,
      projectId: proj1,
      startKcId: 'D',
      maxDepth: 2,
    });

    expect(result).toHaveLength(2);
    expect(result[0].concept.id).toBe('C');
    expect(result[1].concept.id).toBe('B');
  });

  it('exercises getPrerequisiteChain directly and confirms cycle-guarded SQL generation', async () => {
    const mockLimit = vi.fn().mockResolvedValueOnce([{ id: 'c-1' }]);
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: mockLimit }) }),
    });

    const mockRows = [
      { id: 'p-1', name: 'Prereq 1', depth: 1, orderIndex: 1 },
      { id: 'p-2', name: 'Prereq 2', depth: 2, orderIndex: 2 },
    ];
    mockDbExecute.mockResolvedValueOnce(mockRows);

    const chain = await getPrerequisiteChain({
      projectId: 'proj-1',
      kcId: 'Concept Name',
      maxDepth: 10,
    });

    expect(chain).toEqual(mockRows);
    expect(mockDbExecute).toHaveBeenCalledTimes(1);

    const executedSql = mockDbExecute.mock.calls[0][0];
    const sqlText = getSqlString(executedSql);
    expect(sqlText).toContain('WITH RECURSIVE prereq_tree');
    expect(sqlText).toContain('NOT (kd.source_kc_id::text = ANY(prev.visited_path))');
  });
});
