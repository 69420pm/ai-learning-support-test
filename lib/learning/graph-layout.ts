import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import type { PacerCategory } from '@/lib/db/schema';

export type LayoutNode = SimulationNodeDatum & {
  id: string;
  name: string;
  pacerCategory: PacerCategory | string;
  bloomLevel: number;
  slug?: string;
  sourceMaterialId?: string | null;
  radius?: number;
  depth?: number;
};

export type LayoutEdge = {
  id?: string;
  source: string | LayoutNode;
  target: string | LayoutNode;
  relationshipType?: string;
  reasoning?: string | null;
};

export type PacerConfig = {
  label: string;
  color: string;
};

export const PACER_CATEGORY_CONFIG: Record<string, PacerConfig> = {
  procedural: {
    label: 'Procedural',
    color: '#3b82f6',
  },
  conceptual: {
    label: 'Conceptual',
    color: '#a855f7',
  },
  analogous: {
    label: 'Analogous',
    color: '#f59e0b',
  },
  evidence: {
    label: 'Evidence',
    color: '#10b981',
  },
  reference: {
    label: 'Reference',
    color: '#64748b',
  },
};

const DEFAULT_PACER_COLOR = '#64748b';

export function getPacerColor(category?: string | null): string {
  if (!category) return DEFAULT_PACER_COLOR;
  const key = category.toLowerCase().trim();
  return PACER_CATEGORY_CONFIG[key]?.color ?? DEFAULT_PACER_COLOR;
}

export function getBloomRadius(bloomLevel?: number | null): number {
  if (bloomLevel === undefined || bloomLevel === null || Number.isNaN(bloomLevel)) {
    return 18;
  }
  const clamped = Math.max(1, Math.min(6, bloomLevel));
  return 18 + (clamped - 1) * (18 / 5);
}

export type EdgeEndpoints = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

/**
 * Calculates line endpoints connecting two circular nodes,
 * truncating endpoints at node perimeters with arrow clearance.
 */
export function calculateEdgeEndpoints(
  sourceNode: LayoutNode,
  targetNode: LayoutNode,
): EdgeEndpoints | null {
  const sx = sourceNode.x ?? 0;
  const sy = sourceNode.y ?? 0;
  const tx = targetNode.x ?? 0;
  const ty = targetNode.y ?? 0;

  const dx = tx - sx;
  const dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return null;

  const sRadius = sourceNode.radius ?? 24;
  const tRadius = targetNode.radius ?? 24;

  return {
    x1: sx + (dx / dist) * sRadius,
    y1: sy + (dy / dist) * sRadius,
    x2: tx - (dx / dist) * (tRadius + 8),
    y2: ty - (dy / dist) * (tRadius + 8),
  };
}

export type CanvasTransform = {
  x: number;
  y: number;
  scale: number;
};

/**
 * Computes responsive fit-to-view pan and zoom transform based on node bounding box.
 */
export function computeFitViewTransform(
  nodes: LayoutNode[],
  viewportWidth: number,
  viewportHeight: number,
  padding = 60,
): CanvasTransform {
  if (nodes.length === 0) {
    return { x: 0, y: 0, scale: 1 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const node of nodes) {
    const x = node.x ?? viewportWidth / 2;
    const y = node.y ?? viewportHeight / 2;
    const r = node.radius ?? 24;

    minX = Math.min(minX, x - r);
    maxX = Math.max(maxX, x + r);
    minY = Math.min(minY, y - r);
    maxY = Math.max(maxY, y + r);
  }

  const contentWidth = Math.max(1, maxX - minX);
  const contentHeight = Math.max(1, maxY - minY);

  const availableWidth = Math.max(50, viewportWidth - padding * 2);
  const availableHeight = Math.max(50, viewportHeight - padding * 2);

  const scaleX = availableWidth / contentWidth;
  const scaleY = availableHeight / contentHeight;
  const scale = Math.min(1.5, Math.max(0.25, Math.min(scaleX, scaleY)));

  const contentCenterX = (minX + maxX) / 2;
  const contentCenterY = (minY + maxY) / 2;

  const x = viewportWidth / 2 - contentCenterX * scale;
  const y = viewportHeight / 2 - contentCenterY * scale;

  return { x, y, scale };
}

function getEdgeEndpointId(endpoint: string | LayoutNode): string {
  return typeof endpoint === 'string' ? endpoint : endpoint.id;
}

export type LayoutOptions = {
  width?: number;
  height?: number;
  padding?: number;
};

/**
 * Computes hierarchical topological DAG layer positioning.
 * Root prerequisites appear at the top (lower y),
 * downstream dependent concepts appear downstream (higher y).
 */
type AdjacencyData = {
  nodeMap: Map<string, LayoutNode>;
  inDegree: Map<string, number>;
  outgoing: Map<string, string[]>;
};

function buildAdjacency(nodes: LayoutNode[], edges: LayoutEdge[]): AdjacencyData {
  const nodeMap = new Map<string, LayoutNode>();
  const inDegree = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const node of nodes) {
    nodeMap.set(node.id, { ...node });
    inDegree.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of edges) {
    const sId = getEdgeEndpointId(edge.source);
    const tId = getEdgeEndpointId(edge.target);
    if (nodeMap.has(sId) && nodeMap.has(tId)) {
      outgoing.get(sId)?.push(tId);
      inDegree.set(tId, (inDegree.get(tId) ?? 0) + 1);
    }
  }

  return { nodeMap, inDegree, outgoing };
}

function initializeDepthMap(
  nodes: LayoutNode[],
  inDegree: Map<string, number>,
): Map<string, number> {
  const depthMap = new Map<string, number>();
  for (const [id, deg] of inDegree.entries()) {
    if (deg === 0) {
      depthMap.set(id, 0);
    }
  }

  if (depthMap.size === 0 && nodes.length > 0) {
    let minDeg = Number.POSITIVE_INFINITY;
    let minId = nodes[0]?.id;
    for (const [id, deg] of inDegree.entries()) {
      if (deg < minDeg) {
        minDeg = deg;
        minId = id;
      }
    }
    if (minId) {
      depthMap.set(minId, 0);
    }
  }

  return depthMap;
}

function relaxDepths(
  depthMap: Map<string, number>,
  outgoing: Map<string, string[]>,
  totalNodes: number,
) {
  const queue: string[] = Array.from(depthMap.keys());
  const relaxCount = new Map<string, number>();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (!currentId) break;
    const currentDepth = depthMap.get(currentId) ?? 0;
    const nextIds = outgoing.get(currentId) ?? [];

    for (const nextId of nextIds) {
      const nextDepth = currentDepth + 1;
      const prevDepth = depthMap.get(nextId);
      const visits = (relaxCount.get(nextId) ?? 0) + 1;
      relaxCount.set(nextId, visits);

      if (visits <= totalNodes && (prevDepth === undefined || nextDepth > prevDepth)) {
        depthMap.set(nextId, nextDepth);
        queue.push(nextId);
      }
    }
  }
}

function assignCoordinates(
  depthMap: Map<string, number>,
  nodeMap: Map<string, LayoutNode>,
  width: number,
  height: number,
  padding: number,
): LayoutNode[] {
  const layers = new Map<number, LayoutNode[]>();
  let maxDepth = 0;

  for (const [id, depth] of depthMap.entries()) {
    maxDepth = Math.max(maxDepth, depth);
    const layerNodes = layers.get(depth) ?? [];
    const node = nodeMap.get(id);
    if (node) {
      node.depth = depth;
      layerNodes.push(node);
      layers.set(depth, layerNodes);
    }
  }

  const availableWidth = Math.max(100, width - padding * 2);
  const availableHeight = Math.max(100, height - padding * 2);
  const layerHeight = maxDepth > 0 ? availableHeight / maxDepth : 0;
  const result: LayoutNode[] = [];

  for (let d = 0; d <= maxDepth; d++) {
    const layerNodes = layers.get(d) ?? [];
    const count = layerNodes.length;
    const y = maxDepth === 0 ? height / 2 : padding + d * layerHeight;

    for (let i = 0; i < count; i++) {
      const node = layerNodes[i];
      node.x = padding + ((i + 0.5) / count) * availableWidth;
      node.y = y;
      node.radius = getBloomRadius(node.bloomLevel);
      result.push(node);
    }
  }

  return result;
}

/**
 * Computes hierarchical topological DAG layer positioning.
 * Root prerequisites appear at the top (lower y),
 * downstream dependent concepts appear downstream (higher y).
 */
export function computeDagLayout(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options?: LayoutOptions,
): LayoutNode[] {
  if (nodes.length === 0) return [];

  const width = options?.width ?? 800;
  const height = options?.height ?? 600;
  const padding = options?.padding ?? 60;

  const { nodeMap, inDegree, outgoing } = buildAdjacency(nodes, edges);
  const depthMap = initializeDepthMap(nodes, inDegree);

  relaxDepths(depthMap, outgoing, nodes.length);

  for (const node of nodes) {
    if (!depthMap.has(node.id)) {
      depthMap.set(node.id, 0);
    }
  }

  return assignCoordinates(depthMap, nodeMap, width, height, padding);
}

/**
 * Creates and initializes a d3-force simulation with physics forces.
 */
export function createForceSimulation(
  nodes: LayoutNode[],
  edges: LayoutEdge[],
  options?: LayoutOptions,
): Simulation<LayoutNode, SimulationLinkDatum<LayoutNode>> {
  const width = options?.width ?? 800;
  const height = options?.height ?? 600;

  for (const node of nodes) {
    if (node.x === undefined) {
      node.x = width / 2 + (Math.random() - 0.5) * (width * 0.4);
    }
    if (node.y === undefined) {
      node.y = height / 2 + (Math.random() - 0.5) * (height * 0.4);
    }
    if (!node.radius) {
      node.radius = getBloomRadius(node.bloomLevel);
    }
  }

  const links: SimulationLinkDatum<LayoutNode>[] = edges.map((edge) => ({
    source: getEdgeEndpointId(edge.source) as unknown as LayoutNode,
    target: getEdgeEndpointId(edge.target) as unknown as LayoutNode,
  }));

  const linkForce = forceLink<LayoutNode, SimulationLinkDatum<LayoutNode>>(links)
    .id((d) => d.id)
    .distance(120)
    .strength(0.7);

  const simulation = forceSimulation<LayoutNode>(nodes)
    .force('link', linkForce)
    .force('charge', forceManyBody().strength(-350).distanceMax(500))
    .force('center', forceCenter(width / 2, height / 2).strength(0.08))
    .force(
      'collide',
      forceCollide<LayoutNode>((d) => (d.radius ?? getBloomRadius(d.bloomLevel)) + 24).iterations(
        2,
      ),
    );

  return simulation;
}
