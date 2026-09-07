import type { PacerCategory } from '@/lib/db/schema';

export type GraphDiagnostics = {
  totalComponents: number;
  nodeCount: number;
  totalDependencies: number;
  edgeCount: number;
  orphanCount: number;
  hasCycles: boolean;
  cyclePaths: string[][];
  pacerDistribution: Record<PacerCategory, number>;
  bloomDistribution: Record<number, number>;
};

export function createEmptyDiagnostics(): GraphDiagnostics {
  return {
    totalComponents: 0,
    nodeCount: 0,
    totalDependencies: 0,
    edgeCount: 0,
    orphanCount: 0,
    hasCycles: false,
    cyclePaths: [],
    pacerDistribution: {
      procedural: 0,
      conceptual: 0,
      analogous: 0,
      evidence: 0,
      reference: 0,
    },
    bloomDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 },
  };
}

export function calculatePacerDistribution(
  components: Array<{ pacerCategory?: PacerCategory | string }>,
): Record<PacerCategory, number> {
  const distribution: Record<PacerCategory, number> = {
    procedural: 0,
    conceptual: 0,
    analogous: 0,
    evidence: 0,
    reference: 0,
  };

  for (const c of components) {
    if (c.pacerCategory && c.pacerCategory in distribution) {
      distribution[c.pacerCategory as PacerCategory] += 1;
    }
  }

  return distribution;
}

export function calculateBloomDistribution(
  components: Array<{ bloomLevel?: number }>,
): Record<number, number> {
  const distribution: Record<number, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
    6: 0,
  };

  for (const c of components) {
    if (c.bloomLevel !== undefined && c.bloomLevel >= 1 && c.bloomLevel <= 6) {
      distribution[c.bloomLevel] += 1;
    }
  }

  return distribution;
}

export function calculateOrphanCount(
  componentIds: Set<string>,
  dependencies: Array<{ sourceKcId: string; targetKcId: string }>,
): number {
  const connectedNodeIds = new Set<string>();

  for (const dep of dependencies) {
    if (componentIds.has(dep.sourceKcId) && componentIds.has(dep.targetKcId)) {
      connectedNodeIds.add(dep.sourceKcId);
      connectedNodeIds.add(dep.targetKcId);
    }
  }

  let orphanCount = 0;
  for (const id of componentIds) {
    if (!connectedNodeIds.has(id)) {
      orphanCount += 1;
    }
  }

  return orphanCount;
}

export function buildAdjacencyList(
  componentIds: Set<string>,
  dependencies: Array<{ sourceKcId: string; targetKcId: string }>,
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  for (const id of componentIds) {
    adjacency.set(id, []);
  }

  for (const dep of dependencies) {
    if (componentIds.has(dep.sourceKcId) && componentIds.has(dep.targetKcId)) {
      const neighbors = adjacency.get(dep.sourceKcId);
      if (neighbors) {
        neighbors.push(dep.targetKcId);
      }
    }
  }

  return adjacency;
}

function exploreNeighbors(
  nodeId: string,
  neighbors: string[],
  indices: Map<string, number>,
  lowlink: Map<string, number>,
  onStack: Map<string, boolean>,
  strongConnect: (id: string) => void,
) {
  for (const neighborId of neighbors) {
    const neighborIndex = indices.get(neighborId) ?? -1;
    if (neighborIndex === -1) {
      strongConnect(neighborId);
      const nodeLow = lowlink.get(nodeId) ?? 0;
      const neighborLow = lowlink.get(neighborId) ?? 0;
      lowlink.set(nodeId, Math.min(nodeLow, neighborLow));
    } else if (onStack.get(neighborId)) {
      const nodeLow = lowlink.get(nodeId) ?? 0;
      lowlink.set(nodeId, Math.min(nodeLow, neighborIndex));
    }
  }
}

function extractSccComponent(
  nodeId: string,
  stack: string[],
  onStack: Map<string, boolean>,
  adjacency: Map<string, string[]>,
): string[] | null {
  const scc: string[] = [];
  while (stack.length > 0) {
    const w = stack.pop();
    if (!w) break;
    onStack.set(w, false);
    scc.push(w);
    if (w === nodeId) break;
  }

  const hasSelfLoop = scc.length === 1 && (adjacency.get(nodeId)?.includes(nodeId) ?? false);
  if (scc.length > 1 || hasSelfLoop) {
    return scc;
  }
  return null;
}

/**
 * Tarjan's Strongly Connected Components (SCC) algorithm for topological cycle detection.
 * Identifies all cycles and self-loops in O(V + E) time.
 */
export function detectCyclesTarjan(
  componentIds: Set<string>,
  dependencies: Array<{ sourceKcId: string; targetKcId: string }>,
): { hasCycles: boolean; cyclePaths: string[][] } {
  const adjacency = buildAdjacencyList(componentIds, dependencies);

  let currentIndex = 0;
  const indices = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Map<string, boolean>();
  const stack: string[] = [];
  const cyclePaths: string[][] = [];

  for (const id of componentIds) {
    indices.set(id, -1);
    lowlink.set(id, -1);
    onStack.set(id, false);
  }

  function strongConnect(nodeId: string) {
    indices.set(nodeId, currentIndex);
    lowlink.set(nodeId, currentIndex);
    currentIndex += 1;

    stack.push(nodeId);
    onStack.set(nodeId, true);

    const neighbors = adjacency.get(nodeId) ?? [];
    exploreNeighbors(nodeId, neighbors, indices, lowlink, onStack, strongConnect);

    if (lowlink.get(nodeId) === indices.get(nodeId)) {
      const cycleScc = extractSccComponent(nodeId, stack, onStack, adjacency);
      if (cycleScc) {
        cyclePaths.push(cycleScc);
      }
    }
  }

  for (const id of componentIds) {
    if ((indices.get(id) ?? -1) === -1) {
      strongConnect(id);
    }
  }

  return {
    hasCycles: cyclePaths.length > 0,
    cyclePaths,
  };
}

export type DiagnosticComponent = {
  id: string;
  pacerCategory?: PacerCategory | string;
  bloomLevel?: number;
};

export type DiagnosticDependency = {
  sourceKcId: string;
  targetKcId: string;
};

export function computeGraphDiagnostics(
  components: DiagnosticComponent[],
  dependencies: DiagnosticDependency[],
): GraphDiagnostics {
  const componentIds = new Set(components.map((c) => c.id));
  const { hasCycles, cyclePaths } = detectCyclesTarjan(componentIds, dependencies);

  return {
    totalComponents: components.length,
    nodeCount: components.length,
    totalDependencies: dependencies.length,
    edgeCount: dependencies.length,
    orphanCount: calculateOrphanCount(componentIds, dependencies),
    hasCycles,
    cyclePaths,
    pacerDistribution: calculatePacerDistribution(components),
    bloomDistribution: calculateBloomDistribution(components),
  };
}
