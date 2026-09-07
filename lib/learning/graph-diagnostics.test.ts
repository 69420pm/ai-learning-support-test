import { describe, expect, it } from 'vitest';
import {
  calculateBloomDistribution,
  calculateOrphanCount,
  calculatePacerDistribution,
  computeGraphDiagnostics,
  detectCyclesTarjan,
} from './graph-diagnostics';

describe('Graph Diagnostics & Topological Health Algorithms (lib/learning)', () => {
  describe('calculatePacerDistribution', () => {
    it('initializes all PACER categories to zero', () => {
      const dist = calculatePacerDistribution([]);
      expect(dist).toEqual({
        procedural: 0,
        conceptual: 0,
        analogous: 0,
        evidence: 0,
        reference: 0,
      });
    });

    it('accurately counts categories and ignores unknown categories', () => {
      const dist = calculatePacerDistribution([
        { pacerCategory: 'procedural' },
        { pacerCategory: 'procedural' },
        { pacerCategory: 'conceptual' },
        { pacerCategory: 'analogous' },
        { pacerCategory: 'evidence' },
        { pacerCategory: 'reference' },
        { pacerCategory: 'invalid-category' },
      ]);
      expect(dist).toEqual({
        procedural: 2,
        conceptual: 1,
        analogous: 1,
        evidence: 1,
        reference: 1,
      });
    });
  });

  describe('calculateBloomDistribution', () => {
    it('initializes all Bloom levels 1-6 to zero', () => {
      const dist = calculateBloomDistribution([]);
      expect(dist).toEqual({
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
      });
    });

    it('tallies valid Bloom levels 1-6 and ignores out-of-range levels', () => {
      const dist = calculateBloomDistribution([
        { bloomLevel: 1 },
        { bloomLevel: 3 },
        { bloomLevel: 3 },
        { bloomLevel: 6 },
        { bloomLevel: 0 },
        { bloomLevel: 7 },
      ]);
      expect(dist).toEqual({
        1: 1,
        2: 0,
        3: 2,
        4: 0,
        5: 0,
        6: 1,
      });
    });
  });

  describe('calculateOrphanCount', () => {
    it('returns 0 for empty nodes', () => {
      expect(calculateOrphanCount(new Set(), [])).toBe(0);
    });

    it('counts nodes with 0 incident edges as orphans', () => {
      const nodes = new Set(['A', 'B', 'Orphan1', 'Orphan2']);
      const edges = [{ sourceKcId: 'A', targetKcId: 'B' }];
      expect(calculateOrphanCount(nodes, edges)).toBe(2);
    });

    it('does not consider dangling edges to non-existent nodes as valid connections', () => {
      const nodes = new Set(['A', 'B']);
      // 'A' -> 'C' where 'C' is not in nodes
      const edges = [{ sourceKcId: 'A', targetKcId: 'C' }];
      // Both A and B are orphans since the edge to C is dangling
      expect(calculateOrphanCount(nodes, edges)).toBe(2);
    });
  });

  describe('detectCyclesTarjan (Tarjan SCC Cycle Detection)', () => {
    it('returns hasCycles=false for empty graph', () => {
      const result = detectCyclesTarjan(new Set(), []);
      expect(result.hasCycles).toBe(false);
      expect(result.cyclePaths).toEqual([]);
    });

    it('returns hasCycles=false for an acyclic DAG (including diamond structure)', () => {
      const nodes = new Set(['A', 'B', 'C', 'D']);
      const edges = [
        { sourceKcId: 'A', targetKcId: 'B' },
        { sourceKcId: 'A', targetKcId: 'C' },
        { sourceKcId: 'B', targetKcId: 'D' },
        { sourceKcId: 'C', targetKcId: 'D' },
      ];
      const result = detectCyclesTarjan(nodes, edges);
      expect(result.hasCycles).toBe(false);
      expect(result.cyclePaths).toEqual([]);
    });

    it('detects a simple mutual cycle A <-> B', () => {
      const nodes = new Set(['A', 'B']);
      const edges = [
        { sourceKcId: 'A', targetKcId: 'B' },
        { sourceKcId: 'B', targetKcId: 'A' },
      ];
      const result = detectCyclesTarjan(nodes, edges);
      expect(result.hasCycles).toBe(true);
      expect(result.cyclePaths).toHaveLength(1);
      expect(result.cyclePaths[0]).toContain('A');
      expect(result.cyclePaths[0]).toContain('B');
    });

    it('detects multi-node cycle A -> B -> C -> A', () => {
      const nodes = new Set(['A', 'B', 'C', 'D']);
      const edges = [
        { sourceKcId: 'A', targetKcId: 'B' },
        { sourceKcId: 'B', targetKcId: 'C' },
        { sourceKcId: 'C', targetKcId: 'A' },
        { sourceKcId: 'C', targetKcId: 'D' },
      ];
      const result = detectCyclesTarjan(nodes, edges);
      expect(result.hasCycles).toBe(true);
      expect(result.cyclePaths).toHaveLength(1);
      const scc = result.cyclePaths[0];
      expect(scc).toHaveLength(3);
      expect(scc).toContain('A');
      expect(scc).toContain('B');
      expect(scc).toContain('C');
      expect(scc).not.toContain('D');
    });

    it('detects self-loop A -> A', () => {
      const nodes = new Set(['A', 'B']);
      const edges = [
        { sourceKcId: 'A', targetKcId: 'A' },
        { sourceKcId: 'A', targetKcId: 'B' },
      ];
      const result = detectCyclesTarjan(nodes, edges);
      expect(result.hasCycles).toBe(true);
      expect(result.cyclePaths).toEqual([['A']]);
    });
  });

  describe('computeGraphDiagnostics', () => {
    it('returns accurate comprehensive metrics for a complex topology', () => {
      const components = [
        {
          id: 'A',
          projectId: 'p1',
          userId: 'u1',
          slug: 'a',
          name: 'Concept A',
          pacerCategory: 'procedural' as const,
          bloomLevel: 3,
          aliases: [],
          status: 'active',
          orderIndex: 0,
          sourceMaterialId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'B',
          projectId: 'p1',
          userId: 'u1',
          slug: 'b',
          name: 'Concept B',
          pacerCategory: 'conceptual' as const,
          bloomLevel: 4,
          aliases: [],
          status: 'active',
          orderIndex: 1,
          sourceMaterialId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'C',
          projectId: 'p1',
          userId: 'u1',
          slug: 'c',
          name: 'Concept C',
          pacerCategory: 'evidence' as const,
          bloomLevel: 1,
          aliases: [],
          status: 'active',
          orderIndex: 2,
          sourceMaterialId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const dependencies = [
        {
          id: 'dep-1',
          projectId: 'p1',
          sourceKcId: 'A',
          targetKcId: 'B',
          relationshipType: 'prerequisite',
          reasoning: null,
          isTransitive: false,
          sourceMaterialId: null,
          createdAt: new Date(),
        },
      ];

      const diagnostics = computeGraphDiagnostics(components, dependencies);

      expect(diagnostics.totalComponents).toBe(3);
      expect(diagnostics.nodeCount).toBe(3);
      expect(diagnostics.totalDependencies).toBe(1);
      expect(diagnostics.edgeCount).toBe(1);
      expect(diagnostics.orphanCount).toBe(1); // C is orphan
      expect(diagnostics.hasCycles).toBe(false);
      expect(diagnostics.pacerDistribution.procedural).toBe(1);
      expect(diagnostics.pacerDistribution.conceptual).toBe(1);
      expect(diagnostics.pacerDistribution.evidence).toBe(1);
      expect(diagnostics.bloomDistribution[3]).toBe(1);
      expect(diagnostics.bloomDistribution[4]).toBe(1);
      expect(diagnostics.bloomDistribution[1]).toBe(1);
    });
  });
});
