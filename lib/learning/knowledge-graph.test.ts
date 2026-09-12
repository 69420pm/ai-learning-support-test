import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { KnowledgeComponent, KnowledgeDependency, Material } from '@/lib/db/schema';
import {
  computeGraphNeighborhood,
  computeReadyToLearnFrontier,
  getProjectGraphTopology,
} from './knowledge-graph';

const mockGetKnowledgeComponents = vi.fn();
const mockGetKnowledgeDependencies = vi.fn();
vi.mock('@/lib/db/queries/knowledge', () => ({
  getKnowledgeComponentsByProjectId: (...args: unknown[]) => mockGetKnowledgeComponents(...args),
  getKnowledgeDependenciesByProjectId: (...args: unknown[]) =>
    mockGetKnowledgeDependencies(...args),
}));

const mockGetMaterials = vi.fn();
vi.mock('@/lib/db/queries/material', () => ({
  getMaterialsByProjectId: (...args: unknown[]) => mockGetMaterials(...args),
}));

describe('Knowledge Graph Pedagogical Domain Module (lib/learning/knowledge-graph.ts)', () => {
  const defaultProjectId = '11111111-1111-1111-1111-111111111111';
  const defaultUserId = '22222222-2222-2222-2222-222222222222';

  const sampleComponents: KnowledgeComponent[] = [
    {
      id: 'kc-1',
      projectId: defaultProjectId,
      userId: defaultUserId,
      slug: 'calculus-basics',
      name: 'Calculus Basics',
      pacerCategory: 'conceptual',
      bloomLevel: 1,
      aliases: [],
      embedding: null,
      sourceMaterialId: null,
      status: 'active',
      orderIndex: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'kc-2',
      projectId: defaultProjectId,
      userId: defaultUserId,
      slug: 'derivatives',
      name: 'Derivatives',
      pacerCategory: 'procedural',
      bloomLevel: 3,
      aliases: [],
      embedding: null,
      sourceMaterialId: null,
      status: 'active',
      orderIndex: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'kc-3',
      projectId: defaultProjectId,
      userId: defaultUserId,
      slug: 'integrals',
      name: 'Integrals',
      pacerCategory: 'procedural',
      bloomLevel: 4,
      aliases: [],
      embedding: null,
      sourceMaterialId: null,
      status: 'active',
      orderIndex: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const sampleDependencies: KnowledgeDependency[] = [
    {
      id: 'dep-1',
      projectId: defaultProjectId,
      sourceKcId: 'kc-1', // kc-1 is prerequisite
      targetKcId: 'kc-2', // for kc-2
      relationshipType: 'prerequisite',
      reasoning: 'Need basics before derivatives',
      sourceMaterialId: null,
      isTransitive: false,
      createdAt: new Date(),
    },
    {
      id: 'dep-2',
      projectId: defaultProjectId,
      sourceKcId: 'kc-2', // kc-2 is prerequisite
      targetKcId: 'kc-3', // for kc-3
      relationshipType: 'prerequisite',
      reasoning: 'Need derivatives before integrals',
      sourceMaterialId: null,
      isTransitive: false,
      createdAt: new Date(),
    },
  ];

  const sampleMaterials: Material[] = [
    {
      id: 'mat-1',
      projectId: defaultProjectId,
      userId: defaultUserId,
      title: 'Calculus Textbook',
      filename: 'calculus.pdf',
      fileType: 'application/pdf',
      fileSize: 1024,
      storagePath: 'path.pdf',
      status: 'ready',
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetKnowledgeComponents.mockResolvedValue([...sampleComponents]);
    mockGetKnowledgeDependencies.mockResolvedValue([...sampleDependencies]);
    mockGetMaterials.mockResolvedValue([...sampleMaterials]);
  });

  describe('getProjectGraphTopology', () => {
    it('aggregates components, dependencies, materials, and diagnostics cleanly', async () => {
      const topology = await getProjectGraphTopology({
        projectId: defaultProjectId,
        userId: defaultUserId,
      });

      expect(topology).toEqual({
        components: sampleComponents,
        dependencies: sampleDependencies,
        materials: sampleMaterials,
        diagnostics: expect.objectContaining({
          totalComponents: 3,
          nodeCount: 3,
          totalDependencies: 2,
          edgeCount: 2,
          orphanCount: 0,
          hasCycles: false,
        }),
      });

      expect(mockGetKnowledgeComponents).toHaveBeenCalledWith({ projectId: defaultProjectId });
      expect(mockGetKnowledgeDependencies).toHaveBeenCalledWith({ projectId: defaultProjectId });
      expect(mockGetMaterials).toHaveBeenCalledWith({
        projectId: defaultProjectId,
        userId: defaultUserId,
      });
    });
  });

  describe('computeReadyToLearnFrontier (In-Memory Pedagogical Analytics)', () => {
    it('identifies roots with no prerequisites as initial frontier when no KCs are mastered', () => {
      const frontier = computeReadyToLearnFrontier(sampleComponents, sampleDependencies, []);

      expect(frontier).toHaveLength(1);
      expect(frontier[0].id).toBe('kc-1');
    });

    it('unlocks downstream concepts when prerequisites are satisfied in masteredKcIds', () => {
      const frontierAfterMasteringRoot = computeReadyToLearnFrontier(
        sampleComponents,
        sampleDependencies,
        ['kc-1'],
      );

      expect(frontierAfterMasteringRoot).toHaveLength(1);
      expect(frontierAfterMasteringRoot[0].id).toBe('kc-2');
    });

    it('unlocks subsequent concepts once all upstream dependencies are satisfied', () => {
      const frontierAfterMasteringTwo = computeReadyToLearnFrontier(
        sampleComponents,
        sampleDependencies,
        ['kc-1', 'kc-2'],
      );

      expect(frontierAfterMasteringTwo).toHaveLength(1);
      expect(frontierAfterMasteringTwo[0].id).toBe('kc-3');
    });

    it('returns empty frontier when all concepts are mastered', () => {
      const allMastered = computeReadyToLearnFrontier(sampleComponents, sampleDependencies, [
        'kc-1',
        'kc-2',
        'kc-3',
      ]);

      expect(allMastered).toHaveLength(0);
    });

    it('ignores inactive concepts from the frontier', () => {
      const withInactive = [
        ...sampleComponents,
        {
          ...sampleComponents[0],
          id: 'kc-inactive',
          status: 'archived',
        },
      ];

      const frontier = computeReadyToLearnFrontier(withInactive, sampleDependencies, []);
      expect(frontier.some((kc) => kc.id === 'kc-inactive')).toBe(false);
    });
  });

  describe('computeGraphNeighborhood (In-Memory Graph Traversal)', () => {
    it('computes 1-hop prerequisites and unlocked concepts for a given concept', () => {
      const neighborhood = computeGraphNeighborhood(
        sampleComponents,
        sampleDependencies,
        'kc-2',
        1,
      );

      expect(neighborhood.concept?.id).toBe('kc-2');
      expect(neighborhood.prerequisites).toHaveLength(1);
      expect(neighborhood.prerequisites[0].id).toBe('kc-1');
      expect(neighborhood.unlocked).toHaveLength(1);
      expect(neighborhood.unlocked[0].id).toBe('kc-3');
    });

    it('returns null concept when target KC is not found', () => {
      const neighborhood = computeGraphNeighborhood(
        sampleComponents,
        sampleDependencies,
        'non-existent',
      );

      expect(neighborhood.concept).toBeNull();
      expect(neighborhood.prerequisites).toHaveLength(0);
      expect(neighborhood.unlocked).toHaveLength(0);
    });
  });
});
