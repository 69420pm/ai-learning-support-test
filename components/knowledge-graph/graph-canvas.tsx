'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KnowledgeComponent, KnowledgeDependency } from '@/lib/hooks/use-project-graph';
import {
  type CanvasTransform,
  calculateEdgeEndpoints,
  computeDagLayout,
  computeFitViewTransform,
  createForceSimulation,
  getBloomRadius,
  getPacerColor,
  type LayoutEdge,
  type LayoutNode,
} from '@/lib/learning/graph-layout';
import { cn } from '@/lib/utils';
import type { GraphFilterState, LayoutMode } from './graph-toolbar';

export type GraphCanvasProps = {
  components: KnowledgeComponent[];
  dependencies: KnowledgeDependency[];
  layoutMode: LayoutMode;
  filters: GraphFilterState;
  transform: CanvasTransform;
  setTransform: React.Dispatch<React.SetStateAction<CanvasTransform>>;
  onRegisterFitView?: (fitViewFn: () => void) => void;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string | null) => void;
  className?: string;
};

type GraphEdgeProps = {
  dep: KnowledgeDependency;
  sourceNode?: LayoutNode;
  targetNode?: LayoutNode;
  searchMatchSet: Set<string> | null;
};

function GraphEdge({ dep, sourceNode, targetNode, searchMatchSet }: GraphEdgeProps) {
  if (!sourceNode || !targetNode) return null;

  const coords = calculateEdgeEndpoints(sourceNode, targetNode);
  if (!coords) return null;

  const isHighlighted =
    Boolean(searchMatchSet?.has(dep.sourceKcId)) && Boolean(searchMatchSet?.has(dep.targetKcId));

  const isDimmed =
    searchMatchSet !== null &&
    (!searchMatchSet.has(dep.sourceKcId) || !searchMatchSet.has(dep.targetKcId));

  return (
    <line
      x1={coords.x1}
      y1={coords.y1}
      x2={coords.x2}
      y2={coords.y2}
      stroke={isHighlighted ? 'var(--primary)' : 'currentColor'}
      strokeWidth={isHighlighted ? 2.5 : 1.5}
      strokeDasharray={dep.relationshipType === 'recommended' ? '4 2' : undefined}
      className={cn(
        'transition-opacity duration-200',
        isHighlighted ? 'text-primary' : 'text-muted-foreground/40',
        isDimmed ? 'opacity-20' : 'opacity-100',
      )}
      markerEnd={isHighlighted ? 'url(#graph-arrow-highlight)' : 'url(#graph-arrow)'}
      data-testid={`graph-edge-${dep.id}`}
    />
  );
}

type GraphNodeProps = {
  component: KnowledgeComponent;
  node?: LayoutNode;
  isSelected: boolean;
  searchMatchSet: Set<string> | null;
  onPointerDown: (nodeId: string, e: React.PointerEvent) => void;
  onDoubleClick: (nodeId: string, e: React.MouseEvent) => void;
  onSelect: (nodeId: string) => void;
};

function GraphNode({
  component,
  node,
  isSelected,
  searchMatchSet,
  onPointerDown,
  onDoubleClick,
  onSelect,
}: GraphNodeProps) {
  if (!node) return null;

  const cx = node.x ?? 0;
  const cy = node.y ?? 0;
  const radius = node.radius ?? getBloomRadius(component.bloomLevel);
  const pacerColor = getPacerColor(component.pacerCategory);

  const isSearchMatch = searchMatchSet === null || searchMatchSet.has(component.id);
  const isDimmed = searchMatchSet !== null && !isSearchMatch;

  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG <g> cannot be replaced by HTML <button>
    <g
      role="button"
      tabIndex={0}
      transform={`translate(${cx}, ${cy})`}
      className={cn(
        'cursor-pointer transition-opacity duration-200 focus:outline-none',
        isDimmed ? 'opacity-25' : 'opacity-100',
      )}
      onPointerDown={(e) => onPointerDown(component.id, e)}
      onDoubleClick={(e) => onDoubleClick(component.id, e)}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(component.id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(component.id);
        }
      }}
      data-testid={`graph-node-${component.id}`}
      data-node-id={component.id}
      data-bloom={component.bloomLevel}
      data-pacer={component.pacerCategory}
    >
      {/* Search highlight ring */}
      {searchMatchSet !== null && isSearchMatch && (
        <circle
          r={radius + 6}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeDasharray="4 2"
          className="animate-spin-slow"
        />
      )}

      {/* Selection ring */}
      {isSelected && <circle r={radius + 5} fill="none" stroke="var(--primary)" strokeWidth="2" />}

      {/* Pinned indicator ring */}
      {node.fx !== null && node.fx !== undefined && (
        <circle
          r={radius + 3}
          fill="none"
          stroke={pacerColor}
          strokeWidth="1"
          strokeDasharray="2 2"
          opacity="0.6"
        />
      )}

      {/* Main Node Circle */}
      <circle
        r={radius}
        fill={pacerColor}
        fillOpacity="0.18"
        stroke={pacerColor}
        strokeWidth={isSelected ? 3 : 2}
        className="transition-transform hover:scale-105"
      />

      {/* Bloom level indicator badge inside top of node */}
      <text
        y={-radius + 12}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px] font-semibold select-none pointer-events-none"
      >
        L{component.bloomLevel}
      </text>

      {/* PACER category initial in node center */}
      <text
        y={4}
        textAnchor="middle"
        fill={pacerColor}
        className="text-xs font-bold uppercase select-none pointer-events-none"
      >
        {component.pacerCategory?.charAt(0) || 'C'}
      </text>

      {/* Concept Name Label below node */}
      <text
        y={radius + 15}
        textAnchor="middle"
        className="fill-foreground text-xs font-medium select-none pointer-events-none drop-shadow-sm"
        data-testid={`node-name-${component.id}`}
      >
        {component.name.length > 22 ? `${component.name.slice(0, 20)}…` : component.name}
      </text>
    </g>
  );
}

export function GraphCanvas({
  components,
  dependencies,
  layoutMode,
  filters,
  transform,
  setTransform,
  onRegisterFitView,
  selectedNodeId,
  onSelectNode,
  className,
}: GraphCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [, setTick] = useState(0);

  // Filtered components
  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      const matchPacer =
        filters.pacerFilter === 'all' || c.pacerCategory?.toLowerCase() === filters.pacerFilter;
      const matchMaterial =
        filters.materialFilter === 'all' || c.sourceMaterialId === filters.materialFilter;
      return matchPacer && matchMaterial;
    });
  }, [components, filters.pacerFilter, filters.materialFilter]);

  const componentIdSet = useMemo(
    () => new Set(filteredComponents.map((c) => c.id)),
    [filteredComponents],
  );

  // Filtered dependencies (both ends must exist in filtered set)
  const filteredDependencies = useMemo(() => {
    return dependencies.filter(
      (d) => componentIdSet.has(d.sourceKcId) && componentIdSet.has(d.targetKcId),
    );
  }, [dependencies, componentIdSet]);

  // Maintain internal mutable node map for physics and positions
  const nodeMapRef = useRef<Map<string, LayoutNode>>(new Map());

  // Register responsive Fit-to-View handler with parent
  useEffect(() => {
    onRegisterFitView?.(() => {
      const container = containerRef.current;
      const width = container?.clientWidth || 900;
      const height = container?.clientHeight || 650;
      const currentNodes = Array.from(nodeMapRef.current.values());
      const nextTransform = computeFitViewTransform(currentNodes, width, height);
      setTransform(nextTransform);
    });
  }, [onRegisterFitView, setTransform]);

  // Search match set
  const searchMatchSet = useMemo(() => {
    const term = filters.searchTerm.trim().toLowerCase();
    if (!term) return null;

    const matches = new Set<string>();
    for (const c of filteredComponents) {
      if (
        c.name.toLowerCase().includes(term) ||
        c.slug.toLowerCase().includes(term) ||
        (Array.isArray(c.aliases) && c.aliases.some((a) => a.toLowerCase().includes(term)))
      ) {
        matches.add(c.id);
      }
    }
    return matches;
  }, [filteredComponents, filters.searchTerm]);

  // Dragging and Panning state
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeIdRef = useRef<string | null>(null);

  // Sync / Initialize nodes
  const layoutNodes = useMemo(() => {
    const currentMap = nodeMapRef.current;
    const nextNodes: LayoutNode[] = [];

    for (const c of filteredComponents) {
      const existing = currentMap.get(c.id);
      const radius = getBloomRadius(c.bloomLevel);
      if (existing) {
        existing.name = c.name;
        existing.pacerCategory = c.pacerCategory;
        existing.bloomLevel = c.bloomLevel;
        existing.radius = radius;
        nextNodes.push(existing);
      } else {
        const newNode: LayoutNode = {
          id: c.id,
          name: c.name,
          pacerCategory: c.pacerCategory,
          bloomLevel: c.bloomLevel,
          slug: c.slug,
          sourceMaterialId: c.sourceMaterialId,
          radius,
        };
        currentMap.set(c.id, newNode);
        nextNodes.push(newNode);
      }
    }

    return nextNodes;
  }, [filteredComponents]);

  const layoutEdges: LayoutEdge[] = useMemo(() => {
    return filteredDependencies.map((d) => ({
      id: d.id,
      source: d.sourceKcId,
      target: d.targetKcId,
      relationshipType: d.relationshipType,
      reasoning: d.reasoning,
    }));
  }, [filteredDependencies]);

  // Simulation ref
  const simulationRef = useRef<ReturnType<typeof createForceSimulation> | null>(null);

  // Run layout updates when layoutMode or nodes change
  useEffect(() => {
    const container = containerRef.current;
    const width = container?.clientWidth || 900;
    const height = container?.clientHeight || 650;

    if (simulationRef.current) {
      simulationRef.current.stop();
      simulationRef.current = null;
    }

    if (layoutMode === 'dag') {
      const positioned = computeDagLayout(layoutNodes, layoutEdges, { width, height });
      for (const node of positioned) {
        const target = nodeMapRef.current.get(node.id);
        if (target) {
          target.x = node.x;
          target.y = node.y;
          target.radius = node.radius;
          target.depth = node.depth;
        }
      }
      setTick((t) => t + 1);
    } else {
      const sim = createForceSimulation(layoutNodes, layoutEdges, { width, height });
      simulationRef.current = sim;

      let rafId: number | null = null;
      sim.on('tick', () => {
        if (rafId === null) {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            setTick((t) => t + 1);
          });
        }
      });

      return () => {
        if (rafId !== null) cancelAnimationFrame(rafId);
        sim.stop();
      };
    }
  }, [layoutMode, layoutNodes, layoutEdges]);

  // Pan interaction handlers on SVG background
  const handlePointerDownBackground = (e: React.PointerEvent) => {
    const targetTag = (e.target as Element).tagName?.toLowerCase();
    if (e.target === svgRef.current || targetTag === 'rect' || targetTag === 'svg') {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - transform.x,
        y: e.clientY - transform.y,
      };
      try {
        (e.target as Element).setPointerCapture?.(e.pointerId);
      } catch {
        // Fallback if setPointerCapture is unsupported
      }
    }
  };

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isPanningRef.current) {
        setTransform((prev) => ({
          ...prev,
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        }));
        return;
      }

      const draggedId = draggedNodeIdRef.current;
      if (draggedId) {
        const draggedNode = nodeMapRef.current.get(draggedId);
        const svgEl = svgRef.current;
        if (draggedNode && svgEl) {
          const rect = svgEl.getBoundingClientRect();
          const canvasX = (e.clientX - rect.left - transform.x) / transform.scale;
          const canvasY = (e.clientY - rect.top - transform.y) / transform.scale;

          draggedNode.fx = canvasX;
          draggedNode.fy = canvasY;
          draggedNode.x = canvasX;
          draggedNode.y = canvasY;

          if (layoutMode === 'force' && simulationRef.current) {
            simulationRef.current.alpha(0.3).restart();
          } else {
            setTick((t) => t + 1);
          }
        }
      }
    },
    [transform, layoutMode, setTransform],
  );

  const handlePointerUp = useCallback(
    (_e: React.PointerEvent) => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
      }

      if (draggedNodeIdRef.current) {
        const draggedId = draggedNodeIdRef.current;
        draggedNodeIdRef.current = null;
        const node = nodeMapRef.current.get(draggedId);
        if (node && layoutMode === 'force' && simulationRef.current) {
          simulationRef.current.alphaTarget(0);
        }
      }
    },
    [layoutMode],
  );

  // Wheel zoom handler
  const handleWheel = useCallback(
    (e: React.WheelEvent<SVGSVGElement>) => {
      e.preventDefault();
      const svg = svgRef.current;
      if (!svg) return;

      const rect = svg.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newScale = Math.min(Math.max(0.2, transform.scale * zoomFactor), 4.0);

      const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
      const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

      setTransform({ x: newX, y: newY, scale: newScale });
    },
    [transform, setTransform],
  );

  const handleNodePointerDown = (nodeId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    draggedNodeIdRef.current = nodeId;
    const node = nodeMapRef.current.get(nodeId);
    if (node) {
      node.fx = node.x;
      node.fy = node.y;
      if (layoutMode === 'force' && simulationRef.current) {
        simulationRef.current.alphaTarget(0.3).restart();
      }
    }
  };

  const handleNodeDoubleClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const node = nodeMapRef.current.get(nodeId);
    if (node) {
      node.fx = null;
      node.fy = null;
      if (layoutMode === 'force' && simulationRef.current) {
        simulationRef.current.alpha(0.3).restart();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full w-full overflow-hidden bg-muted/10', className)}
    >
      <svg
        ref={svgRef}
        aria-label="Interactive Knowledge Graph Canvas"
        className="h-full w-full select-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDownBackground}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        data-testid="graph-canvas"
      >
        <title>Interactive Knowledge Graph Canvas</title>
        <defs>
          <marker
            id="graph-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" className="fill-muted-foreground/50" />
          </marker>
          <marker
            id="graph-arrow-highlight"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M 0 1.5 L 9 5 L 0 8.5 z" className="fill-primary" />
          </marker>
        </defs>

        {/* Background rect for receiving pan clicks */}
        <rect width="100%" height="100%" fill="transparent" />

        <g transform={`translate(${transform.x}, ${transform.y}) scale(${transform.scale})`}>
          {/* Edges */}
          <g className="edges-layer" data-testid="graph-edges-layer">
            {filteredDependencies.map((dep) => (
              <GraphEdge
                key={dep.id}
                dep={dep}
                sourceNode={nodeMapRef.current.get(dep.sourceKcId)}
                targetNode={nodeMapRef.current.get(dep.targetKcId)}
                searchMatchSet={searchMatchSet}
              />
            ))}
          </g>

          {/* Nodes */}
          <g className="nodes-layer" data-testid="graph-nodes-layer">
            {filteredComponents.map((component) => (
              <GraphNode
                key={component.id}
                component={component}
                node={nodeMapRef.current.get(component.id)}
                isSelected={selectedNodeId === component.id}
                searchMatchSet={searchMatchSet}
                onPointerDown={handleNodePointerDown}
                onDoubleClick={handleNodeDoubleClick}
                onSelect={(id) => onSelectNode?.(selectedNodeId === id ? null : id)}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
