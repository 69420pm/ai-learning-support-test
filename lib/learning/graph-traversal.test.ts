import { describe, expect, it } from 'vitest';
import {
  computeActivePathEdges,
  computeGraphPathHighlightState,
  computePrerequisiteAncestors,
  computeUnlockedDescendants,
  getBloomStageInfo,
  PACER_DETAILS_CONFIG,
} from './graph-traversal';

describe('Graph Traversal & Path Highlighting', () => {
  // Graph topology:
  // A -> B -> C -> D
  // E -> C
  // F (isolated/orphan)
  const sampleDependencies = [
    { id: 'dep-1', sourceKcId: 'kc-a', targetKcId: 'kc-b' },
    { id: 'dep-2', sourceKcId: 'kc-b', targetKcId: 'kc-c' },
    { id: 'dep-3', sourceKcId: 'kc-c', targetKcId: 'kc-d' },
    { id: 'dep-4', sourceKcId: 'kc-e', targetKcId: 'kc-c' },
  ];

  describe('computePrerequisiteAncestors', () => {
    it('returns empty set when no node is selected or node has no prerequisites', () => {
      const ancestorsA = computePrerequisiteAncestors('kc-a', sampleDependencies);
      expect(ancestorsA.size).toBe(0);

      const ancestorsF = computePrerequisiteAncestors('kc-f', sampleDependencies);
      expect(ancestorsF.size).toBe(0);
    });

    it('returns direct and transitive prerequisite ancestors', () => {
      // For kc-c, prerequisites are kc-b, kc-a (via b), and kc-e
      const ancestorsC = computePrerequisiteAncestors('kc-c', sampleDependencies);
      expect(Array.from(ancestorsC).sort()).toEqual(['kc-a', 'kc-b', 'kc-e']);

      // For kc-d, ancestors are kc-c, kc-b, kc-a, kc-e
      const ancestorsD = computePrerequisiteAncestors('kc-d', sampleDependencies);
      expect(Array.from(ancestorsD).sort()).toEqual(['kc-a', 'kc-b', 'kc-c', 'kc-e']);
    });

    it('handles cyclic dependencies gracefully without infinite loop', () => {
      const cyclicDeps = [
        { id: 'dep-c1', sourceKcId: 'kc-1', targetKcId: 'kc-2' },
        { id: 'dep-c2', sourceKcId: 'kc-2', targetKcId: 'kc-1' },
      ];
      const ancestors = computePrerequisiteAncestors('kc-1', cyclicDeps);
      expect(ancestors.has('kc-2')).toBe(true);
    });
  });

  describe('computeUnlockedDescendants', () => {
    it('returns empty set when node unlocks nothing', () => {
      const unlockedD = computeUnlockedDescendants('kc-d', sampleDependencies);
      expect(unlockedD.size).toBe(0);

      const unlockedF = computeUnlockedDescendants('kc-f', sampleDependencies);
      expect(unlockedF.size).toBe(0);
    });

    it('returns direct and transitive unlocked concepts', () => {
      // For kc-a, unlocked concepts are kc-b, kc-c, kc-d
      const unlockedA = computeUnlockedDescendants('kc-a', sampleDependencies);
      expect(Array.from(unlockedA).sort()).toEqual(['kc-b', 'kc-c', 'kc-d']);

      // For kc-b, unlocked concepts are kc-c, kc-d
      const unlockedB = computeUnlockedDescendants('kc-b', sampleDependencies);
      expect(Array.from(unlockedB).sort()).toEqual(['kc-c', 'kc-d']);

      // For kc-e, unlocked concepts are kc-c, kc-d
      const unlockedE = computeUnlockedDescendants('kc-e', sampleDependencies);
      expect(Array.from(unlockedE).sort()).toEqual(['kc-c', 'kc-d']);
    });
  });

  describe('computeActivePathEdges', () => {
    it('identifies edges along upstream and downstream paths', () => {
      const ancestorsC = computePrerequisiteAncestors('kc-c', sampleDependencies);
      const descendantsC = computeUnlockedDescendants('kc-c', sampleDependencies);

      const activeEdges = computeActivePathEdges(
        'kc-c',
        ancestorsC,
        descendantsC,
        sampleDependencies,
      );

      // dep-1: a -> b (upstream)
      // dep-2: b -> c (upstream direct)
      // dep-4: e -> c (upstream direct)
      // dep-3: c -> d (downstream direct)
      expect(Array.from(activeEdges).sort()).toEqual(['dep-1', 'dep-2', 'dep-3', 'dep-4']);
    });
  });

  describe('computeGraphPathHighlightState', () => {
    it('returns neutral highlight state when no node is selected', () => {
      const state = computeGraphPathHighlightState(null, sampleDependencies);
      expect(state.hasSelection).toBe(false);
      expect(state.selectedId).toBeNull();
      expect(state.ancestorIds.size).toBe(0);
      expect(state.descendantIds.size).toBe(0);
      expect(state.highlightedEdgeIds.size).toBe(0);
      expect(state.allHighlightedNodeIds.size).toBe(0);
    });

    it('computes complete highlight sets when a node is selected', () => {
      const state = computeGraphPathHighlightState('kc-b', sampleDependencies);
      expect(state.hasSelection).toBe(true);
      expect(state.selectedId).toBe('kc-b');
      expect(Array.from(state.ancestorIds)).toEqual(['kc-a']);
      expect(Array.from(state.descendantIds).sort()).toEqual(['kc-c', 'kc-d']);
      expect(Array.from(state.allHighlightedNodeIds).sort()).toEqual([
        'kc-a',
        'kc-b',
        'kc-c',
        'kc-d',
      ]);
      // Active edges: a -> b, b -> c, c -> d
      expect(Array.from(state.highlightedEdgeIds).sort()).toEqual(['dep-1', 'dep-2', 'dep-3']);
    });
  });

  describe('Bloom Taxonomy and PACER metadata helpers', () => {
    it('returns stage info for valid Bloom levels 1 to 6', () => {
      const l1 = getBloomStageInfo(1);
      expect(l1.name).toBe('Remember');
      expect(l1.description).toContain('Recall facts');

      const l3 = getBloomStageInfo(3);
      expect(l3.name).toBe('Apply');
      expect(l3.description).toContain('Execute procedures');

      const l6 = getBloomStageInfo(6);
      expect(l6.name).toBe('Create');
    });

    it('falls back gracefully for invalid bloom levels', () => {
      const fallback = getBloomStageInfo(99);
      expect(fallback.name).toBe('Create');
      const fallbackLow = getBloomStageInfo(-2);
      expect(fallbackLow.name).toBe('Remember');
    });

    it('has descriptions for all 5 PACER categories', () => {
      expect(PACER_DETAILS_CONFIG.procedural.description).toBeDefined();
      expect(PACER_DETAILS_CONFIG.conceptual.description).toBeDefined();
      expect(PACER_DETAILS_CONFIG.analogous.description).toBeDefined();
      expect(PACER_DETAILS_CONFIG.evidence.description).toBeDefined();
      expect(PACER_DETAILS_CONFIG.reference.description).toBeDefined();
    });
  });
});
