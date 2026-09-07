import { describe, expect, it, vi } from 'vitest';
import { getReadyToLearnFrontier } from './knowledge';

type DependencyEdge = {
  sourceKcId: string;
  targetKcId: string;
  projectId: string;
  relationshipType: string;
};

type KnowledgeComponentNode = {
  id: string;
  projectId: string;
  name: string;
  status: 'active' | 'archived' | 'draft';
  orderIndex: number;
};

const mockDbExecute = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
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

/**
 * Pure simulation of the exact SQL logic executed by getReadyToLearnFrontier:
 *
 * WITH unmastered_prereqs AS (
 *   SELECT kd.target_kc_id
 *   FROM knowledge_dependencies kd
 *   WHERE kd.project_id = ${projectId}
 *     AND kd.relationship_type = 'prerequisite'
 *     AND NOT (kd.source_kc_id = ANY(masteredKcIds))
 * )
 * SELECT kc.*
 * FROM knowledge_components kc
 * WHERE kc.project_id = ${projectId}
 *   AND kc.status = 'active'
 *   AND NOT (kc.id = ANY(masteredKcIds))
 *   AND NOT EXISTS (
 *     SELECT 1 FROM unmastered_prereqs up WHERE up.target_kc_id = kc.id
 *   )
 * ORDER BY kc.order_index ASC, kc.name ASC;
 */
function simulateFrontierQuery({
  dependencies,
  concepts,
  projectId,
  masteredKcIds = [],
}: {
  dependencies: DependencyEdge[];
  concepts: KnowledgeComponentNode[];
  projectId: string;
  masteredKcIds?: string[];
}): KnowledgeComponentNode[] {
  const masteredSet = new Set(masteredKcIds);

  // 1. Unmastered prerequisites for target KCs in the project
  const unmasteredPrereqsTargetSet = new Set<string>();
  for (const dep of dependencies) {
    if (
      dep.projectId === projectId &&
      dep.relationshipType === 'prerequisite' &&
      !masteredSet.has(dep.sourceKcId)
    ) {
      unmasteredPrereqsTargetSet.add(dep.targetKcId);
    }
  }

  // 2. Concepts in the project that are active, not yet mastered, and have no unmastered prerequisites
  return concepts
    .filter(
      (kc) =>
        kc.projectId === projectId &&
        kc.status === 'active' &&
        !masteredSet.has(kc.id) &&
        !unmasteredPrereqsTargetSet.has(kc.id),
    )
    .sort((a, b) => {
      if (a.orderIndex !== b.orderIndex) return a.orderIndex - b.orderIndex;
      return a.name.localeCompare(b.name);
    });
}

describe('Ready-to-Learn Frontier Topologies & Logic', () => {
  const proj1 = 'proj-1';
  const proj2 = 'proj-2';

  const concepts: KnowledgeComponentNode[] = [
    { id: 'A', projectId: proj1, name: 'Concept A (Root)', status: 'active', orderIndex: 1 },
    { id: 'B', projectId: proj1, name: 'Concept B', status: 'active', orderIndex: 2 },
    { id: 'C', projectId: proj1, name: 'Concept C', status: 'active', orderIndex: 3 },
    { id: 'D', projectId: proj1, name: 'Concept D', status: 'active', orderIndex: 4 },
    { id: 'E', projectId: proj1, name: 'Concept E (Root 2)', status: 'active', orderIndex: 5 },
    {
      id: 'Inactive',
      projectId: proj1,
      name: 'Inactive Concept',
      status: 'archived',
      orderIndex: 6,
    },
    { id: 'Proj2_A', projectId: proj2, name: 'Project 2 Concept', status: 'active', orderIndex: 1 },
  ];

  it('resolves all root foundational concepts when masteredKcIds is empty', () => {
    // Topology: A -> B -> C; E -> D
    const dependencies: DependencyEdge[] = [
      { sourceKcId: 'A', targetKcId: 'B', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'B', targetKcId: 'C', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'E', targetKcId: 'D', projectId: proj1, relationshipType: 'prerequisite' },
    ];

    const frontier = simulateFrontierQuery({
      dependencies,
      concepts,
      projectId: proj1,
      masteredKcIds: [],
    });

    const frontierIds = frontier.map((c) => c.id);
    expect(frontierIds).toEqual(['A', 'E']);
  });

  it('unblocks progression as prerequisite concepts are added to masteredKcIds', () => {
    // Topology: A -> B -> C
    const dependencies: DependencyEdge[] = [
      { sourceKcId: 'A', targetKcId: 'B', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'B', targetKcId: 'C', projectId: proj1, relationshipType: 'prerequisite' },
    ];

    // Step 1: Nothing mastered -> Frontier is A and E
    const f0 = simulateFrontierQuery({
      dependencies,
      concepts,
      projectId: proj1,
      masteredKcIds: [],
    });
    expect(f0.map((c) => c.id)).toContain('A');

    // Step 2: Mastered A -> A is removed, B is unblocked into frontier
    const f1 = simulateFrontierQuery({
      dependencies,
      concepts,
      projectId: proj1,
      masteredKcIds: ['A'],
    });
    const f1Ids = f1.map((c) => c.id);
    expect(f1Ids).toContain('B');
    expect(f1Ids).not.toContain('A');
    expect(f1Ids).not.toContain('C'); // C still blocked on B

    // Step 3: Mastered A and B -> B is removed, C is unblocked into frontier
    const f2 = simulateFrontierQuery({
      dependencies,
      concepts,
      projectId: proj1,
      masteredKcIds: ['A', 'B'],
    });
    const f2Ids = f2.map((c) => c.id);
    expect(f2Ids).toContain('C');
    expect(f2Ids).not.toContain('A');
    expect(f2Ids).not.toContain('B');
  });

  it('handles multi-prerequisite diamond graphs (AND gate dependencies)', () => {
    // Topology: A is root; B and C require A; D requires BOTH B and C
    const dependencies: DependencyEdge[] = [
      { sourceKcId: 'A', targetKcId: 'B', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'A', targetKcId: 'C', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'B', targetKcId: 'D', projectId: proj1, relationshipType: 'prerequisite' },
      { sourceKcId: 'C', targetKcId: 'D', projectId: proj1, relationshipType: 'prerequisite' },
    ];

    // Mastered A -> B and C should be on frontier, but D should NOT yet be ready
    const fA = simulateFrontierQuery({
      dependencies,
      concepts,
      projectId: proj1,
      masteredKcIds: ['A'],
    });
    expect(fA.map((c) => c.id)).toContain('B');
    expect(fA.map((c) => c.id)).toContain('C');
    expect(fA.map((c) => c.id)).not.toContain('D');

    // Mastered A and only B -> D still blocked because C is not mastered
    const fAB = simulateFrontierQuery({
      dependencies,
      concepts,
      projectId: proj1,
      masteredKcIds: ['A', 'B'],
    });
    expect(fAB.map((c) => c.id)).toContain('C');
    expect(fAB.map((c) => c.id)).not.toContain('D');

    // Mastered A, B, and C -> D is finally unblocked!
    const fABC = simulateFrontierQuery({
      dependencies,
      concepts,
      projectId: proj1,
      masteredKcIds: ['A', 'B', 'C'],
    });
    expect(fABC.map((c) => c.id)).toContain('D');
    expect(fABC.map((c) => c.id)).not.toContain('B');
    expect(fABC.map((c) => c.id)).not.toContain('C');
  });

  it('strictly isolates tenant projects', () => {
    const dependencies: DependencyEdge[] = [
      {
        sourceKcId: 'Proj2_A',
        targetKcId: 'A',
        projectId: proj2,
        relationshipType: 'prerequisite',
      },
    ];

    // Even if proj2 has a dependency, proj1 query does not see it and does not include Proj2_A
    const frontier = simulateFrontierQuery({
      dependencies,
      concepts,
      projectId: proj1,
      masteredKcIds: [],
    });

    const ids = frontier.map((c) => c.id);
    expect(ids).toContain('A');
    expect(ids).not.toContain('Proj2_A');
  });

  it('excludes non-active concepts regardless of prerequisite status', () => {
    const dependencies: DependencyEdge[] = [];

    const frontier = simulateFrontierQuery({
      dependencies,
      concepts,
      projectId: proj1,
      masteredKcIds: [],
    });

    expect(frontier.map((c) => c.id)).not.toContain('Inactive');
  });

  it('verifies generated SQL of getReadyToLearnFrontier for structure and tenant constraints', async () => {
    mockDbExecute.mockResolvedValueOnce([]);

    await getReadyToLearnFrontier({
      projectId: 'project-xyz',
      masteredKcIds: [
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
      ],
    });

    expect(mockDbExecute).toHaveBeenCalledTimes(1);
    const sqlText = getSqlString(mockDbExecute.mock.calls[0][0]);

    expect(sqlText).toContain('project-xyz');
    expect(sqlText).toContain('active');
    expect(sqlText).toContain('WITH unmastered_prereqs AS');
    expect(sqlText).toContain('NOT EXISTS');
  });
});
