import type { PacerCategory } from '@/lib/db/schema';
import { PACER_CATEGORY_CONFIG, type PacerConfig } from './graph-layout';

export type BloomStageInfo = {
  level: number;
  name: string;
  description: string;
};

export const BLOOM_TAXONOMY_CONFIG: Record<number, BloomStageInfo> = {
  1: {
    level: 1,
    name: 'Remember',
    description: 'Recall facts, definitions, and foundational concepts',
  },
  2: {
    level: 2,
    name: 'Understand',
    description: 'Explain concepts, interpret principles, and summarize meaning',
  },
  3: {
    level: 3,
    name: 'Apply',
    description: 'Execute procedures, solve problems, and implement techniques',
  },
  4: {
    level: 4,
    name: 'Analyze',
    description: 'Deconstruct structures, examine relationships, and distinguish components',
  },
  5: {
    level: 5,
    name: 'Evaluate',
    description: 'Critique solutions, assess trade-offs, and defend judgments',
  },
  6: {
    level: 6,
    name: 'Create',
    description: 'Synthesize ideas, design architectures, and formulate novel solutions',
  },
};

export function getBloomStageInfo(bloomLevel?: number | null): BloomStageInfo {
  if (bloomLevel === undefined || bloomLevel === null || Number.isNaN(bloomLevel)) {
    return BLOOM_TAXONOMY_CONFIG[1];
  }
  const clamped = Math.max(1, Math.min(6, Math.round(bloomLevel)));
  return BLOOM_TAXONOMY_CONFIG[clamped] ?? BLOOM_TAXONOMY_CONFIG[1];
}

export type PacerDetails = PacerConfig & {
  description: string;
};

export const PACER_DETAILS_CONFIG: Record<PacerCategory, PacerDetails> = {
  procedural: {
    ...PACER_CATEGORY_CONFIG.procedural,
    description: 'Step-by-step algorithms, techniques, and problem-solving workflows',
  },
  conceptual: {
    ...PACER_CATEGORY_CONFIG.conceptual,
    description:
      'Core theoretical models, mental schemas, principles, and interconnected abstractions',
  },
  analogous: {
    ...PACER_CATEGORY_CONFIG.analogous,
    description: 'Metaphors, comparative bridges, and structural parallels to familiar domains',
  },
  evidence: {
    ...PACER_CATEGORY_CONFIG.evidence,
    description:
      'Empirical data, benchmark results, observational proofs, and real-world validations',
  },
  reference: {
    ...PACER_CATEGORY_CONFIG.reference,
    description:
      'Definitional lookup tables, syntax specifications, API signatures, and standardized nomenclature',
  },
};

export type MinimalDependency = {
  id?: string;
  sourceKcId: string;
  targetKcId: string;
};

/**
 * Computes all upstream prerequisite ancestors of a given node ID by traversing incoming edges backwards.
 */
export function computePrerequisiteAncestors(
  selectedNodeId: string,
  dependencies: MinimalDependency[],
): Set<string> {
  const ancestors = new Set<string>();
  const incomingMap = new Map<string, string[]>();

  for (const dep of dependencies) {
    const list = incomingMap.get(dep.targetKcId) ?? [];
    list.push(dep.sourceKcId);
    incomingMap.set(dep.targetKcId, list);
  }

  const queue: string[] = [...(incomingMap.get(selectedNodeId) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || ancestors.has(current)) continue;
    ancestors.add(current);
    const parents = incomingMap.get(current) ?? [];
    for (const parent of parents) {
      if (!ancestors.has(parent)) {
        queue.push(parent);
      }
    }
  }

  return ancestors;
}

/**
 * Computes all downstream unlocked descendants of a given node ID by traversing outgoing edges forwards.
 */
export function computeUnlockedDescendants(
  selectedNodeId: string,
  dependencies: MinimalDependency[],
): Set<string> {
  const descendants = new Set<string>();
  const outgoingMap = new Map<string, string[]>();

  for (const dep of dependencies) {
    const list = outgoingMap.get(dep.sourceKcId) ?? [];
    list.push(dep.targetKcId);
    outgoingMap.set(dep.sourceKcId, list);
  }

  const queue: string[] = [...(outgoingMap.get(selectedNodeId) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || descendants.has(current)) continue;
    descendants.add(current);
    const children = outgoingMap.get(current) ?? [];
    for (const child of children) {
      if (!descendants.has(child)) {
        queue.push(child);
      }
    }
  }

  return descendants;
}

/**
 * Computes all dependency edge IDs along the upstream prerequisite paths and downstream unlocked paths.
 */
export function computeActivePathEdges(
  selectedNodeId: string,
  ancestorIds: Set<string>,
  descendantIds: Set<string>,
  dependencies: MinimalDependency[],
): Set<string> {
  const activeEdgeIds = new Set<string>();
  const upstreamNodes = new Set([...ancestorIds, selectedNodeId]);
  const downstreamNodes = new Set([...descendantIds, selectedNodeId]);

  for (const dep of dependencies) {
    if (!dep.id) continue;

    // Upstream edge: source is in ancestors and target is in upstreamNodes
    const isUpstreamEdge = ancestorIds.has(dep.sourceKcId) && upstreamNodes.has(dep.targetKcId);

    // Downstream edge: source is in downstreamNodes and target is in descendantIds
    const isDownstreamEdge =
      downstreamNodes.has(dep.sourceKcId) && descendantIds.has(dep.targetKcId);

    if (isUpstreamEdge || isDownstreamEdge) {
      activeEdgeIds.add(dep.id);
    }
  }

  return activeEdgeIds;
}

export type GraphPathHighlightState = {
  selectedId: string | null;
  ancestorIds: Set<string>;
  descendantIds: Set<string>;
  allHighlightedNodeIds: Set<string>;
  highlightedEdgeIds: Set<string>;
  hasSelection: boolean;
};

/**
 * High-level helper to compute the complete highlight state for the graph canvas.
 */
export function computeGraphPathHighlightState(
  selectedNodeId: string | null,
  dependencies: MinimalDependency[],
): GraphPathHighlightState {
  if (!selectedNodeId) {
    return {
      selectedId: null,
      ancestorIds: new Set(),
      descendantIds: new Set(),
      allHighlightedNodeIds: new Set(),
      highlightedEdgeIds: new Set(),
      hasSelection: false,
    };
  }

  const ancestorIds = computePrerequisiteAncestors(selectedNodeId, dependencies);
  const descendantIds = computeUnlockedDescendants(selectedNodeId, dependencies);
  const allHighlightedNodeIds = new Set([selectedNodeId, ...ancestorIds, ...descendantIds]);
  const highlightedEdgeIds = computeActivePathEdges(
    selectedNodeId,
    ancestorIds,
    descendantIds,
    dependencies,
  );

  return {
    selectedId: selectedNodeId,
    ancestorIds,
    descendantIds,
    allHighlightedNodeIds,
    highlightedEdgeIds,
    hasSelection: true,
  };
}
