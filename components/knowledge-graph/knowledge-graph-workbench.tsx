'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { useProjectGraph } from '@/lib/hooks/use-project-graph';
import type { CanvasTransform } from '@/lib/learning/graph-layout';
import { isMaterialExtractingGraph } from '@/lib/materials/types';
import { cn } from '@/lib/utils';
import { GraphCanvas } from './graph-canvas';
import {
  GraphEmptyState,
  GraphExtractingState,
  GraphLoadingState,
  GraphReadyState,
} from './graph-progressive-states';
import { type GraphFilterState, GraphToolbar, type LayoutMode } from './graph-toolbar';

export type KnowledgeGraphWorkbenchProps = {
  projectId: string;
  className?: string;
};

export function KnowledgeGraphWorkbench({ projectId, className }: KnowledgeGraphWorkbenchProps) {
  const { components, dependencies, materials, diagnostics, isLoading, error, mutate } =
    useProjectGraph(projectId);

  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force');
  const [filters, setFilters] = useState<GraphFilterState>({
    searchTerm: '',
    pacerFilter: 'all',
    materialFilter: 'all',
  });
  const [transform, setTransform] = useState<CanvasTransform>({ x: 100, y: 80, scale: 1 });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const [isExtractingLocal, setIsExtractingLocal] = useState(false);
  const [isSubmittingExtract, setIsSubmittingExtract] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);

  // Responsive Fit-to-View handler registered by GraphCanvas
  const fitViewFnRef = useRef<(() => void) | null>(null);

  const handleRegisterFitView = useCallback((fn: () => void) => {
    fitViewFnRef.current = fn;
  }, []);

  const handleFitView = useCallback(() => {
    if (fitViewFnRef.current) {
      fitViewFnRef.current();
    } else {
      setTransform({ x: 100, y: 80, scale: 1 });
    }
  }, []);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(prev.scale * 1.25, 4.0),
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(prev.scale / 1.25, 0.25),
    }));
  }, []);

  const handleFilterChange = useCallback((updates: Partial<GraphFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  }, []);

  // Re-sync Graph handler
  const handleResync = useCallback(async () => {
    setIsResyncing(true);
    try {
      await mutate();
    } finally {
      setIsResyncing(false);
    }
  }, [mutate]);

  // Trigger Knowledge Graph Extraction
  const handleGenerateGraph = useCallback(async () => {
    setIsSubmittingExtract(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/graph/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (response.ok) {
        setIsExtractingLocal(true);
        await mutate();
      }
    } catch {
      // Continue polling or allow user to retry
    } finally {
      setIsSubmittingExtract(false);
    }
  }, [projectId, mutate]);

  // Check if any material is actively extracting
  const hasActiveMaterialExtraction = materials.some((m) => isMaterialExtractingGraph(m));
  const isExtracting = isExtractingLocal || hasActiveMaterialExtraction;

  // Progressive State Machine
  if (isLoading && components.length === 0 && materials.length === 0) {
    return <GraphLoadingState />;
  }

  if (error && components.length === 0 && materials.length === 0) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center p-8 text-center"
        data-testid="graph-error-state"
      >
        <p className="text-sm text-destructive">Failed to load knowledge graph.</p>
        <button
          type="button"
          onClick={() => mutate()}
          className="mt-4 text-xs text-primary underline"
        >
          Try again
        </button>
      </div>
    );
  }

  if (materials.length === 0) {
    return <GraphEmptyState projectId={projectId} />;
  }

  if (components.length === 0) {
    if (isExtracting) {
      return <GraphExtractingState />;
    }
    return <GraphReadyState onGenerate={handleGenerateGraph} isSubmitting={isSubmittingExtract} />;
  }

  return (
    <div
      className={cn('flex h-full w-full flex-col overflow-hidden bg-background', className)}
      data-testid="knowledge-graph-workbench"
    >
      <GraphToolbar
        layoutMode={layoutMode}
        onLayoutChange={setLayoutMode}
        filters={filters}
        onFilterChange={handleFilterChange}
        materials={materials}
        diagnostics={diagnostics}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitView={handleFitView}
        onResync={handleResync}
        isResyncing={isResyncing}
      />

      {/* Active re-extraction banner if extraction runs on populated graph */}
      {isExtracting && (
        <div
          className="flex items-center justify-center gap-2 bg-primary/10 border-b border-primary/20 px-4 py-1.5 text-xs text-primary"
          data-testid="graph-active-extraction-banner"
        >
          <Loader2 className="size-3.5 animate-spin" />
          <span>Extracting knowledge components from newly uploaded materials...</span>
        </div>
      )}

      <div className="relative flex-1 overflow-hidden">
        <GraphCanvas
          components={components}
          dependencies={dependencies}
          layoutMode={layoutMode}
          filters={filters}
          transform={transform}
          setTransform={setTransform}
          onRegisterFitView={handleRegisterFitView}
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
        />
      </div>
    </div>
  );
}
