'use client';

import { FileUp, Loader2, Network, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function GraphEmptyState({ projectId }: { projectId: string }) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center p-8 text-center"
      data-testid="graph-empty-state"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50 border border-border/80 mb-4 shadow-sm">
        <Network className="size-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        No Learning Materials Found
      </h3>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Upload course slides, textbooks, or notes to begin extracting concept components and mapping
        your knowledge graph.
      </p>
      <Button asChild className="mt-6 gap-2" data-testid="upload-materials-link">
        <Link href={`/projects/${projectId}/materials`}>
          <FileUp className="size-4" />
          <span>Upload Materials</span>
        </Link>
      </Button>
    </div>
  );
}

export function GraphReadyState({
  onGenerate,
  isSubmitting = false,
}: {
  onGenerate: () => void;
  isSubmitting?: boolean;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center p-8 text-center"
      data-testid="graph-ready-state"
    >
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4 shadow-sm">
        <Sparkles className="size-8 text-primary animate-pulse" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        Materials Ready for Knowledge Extraction
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        You have uploaded materials in this project. Run the concept extraction pipeline to identify
        knowledge components, prerequisite links, and Bloom cognitive levels.
      </p>
      <Button
        onClick={onGenerate}
        disabled={isSubmitting}
        className="mt-6 gap-2"
        data-testid="generate-graph-button"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            <span>Queuing Extraction...</span>
          </>
        ) : (
          <>
            <Network className="size-4" />
            <span>Generate Knowledge Graph</span>
          </>
        )}
      </Button>
    </div>
  );
}

export function GraphExtractingState() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center p-8 text-center"
      data-testid="graph-extracting-state"
    >
      <div className="relative flex size-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4 shadow-sm">
        <Loader2 className="size-8 text-primary animate-spin" />
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-foreground">
        Extracting Knowledge Graph...
      </h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Analyzing materials, discovering key concepts, and calculating prerequisite topology. This
        process runs asynchronously and will automatically render when complete.
      </p>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="relative flex size-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full size-2.5 bg-primary" />
        </span>
        <span>Graph pipeline actively processing...</span>
      </div>
    </div>
  );
}

export function GraphLoadingState() {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center p-8 text-center"
      data-testid="graph-loading-state"
    >
      <Loader2 className="size-8 text-muted-foreground animate-spin mb-3" />
      <p className="text-sm text-muted-foreground">Loading knowledge graph...</p>
    </div>
  );
}
