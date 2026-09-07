'use client';

import {
  AlertTriangle,
  GitFork,
  Maximize2,
  RefreshCw,
  Search,
  Share2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Material } from '@/lib/hooks/use-project-graph';
import type { GraphDiagnostics } from '@/lib/learning/graph-diagnostics';
import { PACER_CATEGORY_CONFIG } from '@/lib/learning/graph-layout';
import { cn } from '@/lib/utils';

export type LayoutMode = 'force' | 'dag';

export type GraphFilterState = {
  searchTerm: string;
  pacerFilter: string;
  materialFilter: string;
};

export type GraphToolbarProps = {
  layoutMode: LayoutMode;
  onLayoutChange: (mode: LayoutMode) => void;
  filters: GraphFilterState;
  onFilterChange: (updates: Partial<GraphFilterState>) => void;
  materials: Material[];
  diagnostics?: GraphDiagnostics;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
  onResync: () => void;
  isResyncing?: boolean;
  className?: string;
};

export function GraphToolbar({
  layoutMode,
  onLayoutChange,
  filters,
  onFilterChange,
  materials,
  diagnostics,
  onZoomIn,
  onZoomOut,
  onFitView,
  onResync,
  isResyncing = false,
  className,
}: GraphToolbarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/60 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-card/40',
        className,
      )}
      data-testid="graph-toolbar"
    >
      {/* Left: Search and Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative min-w-[180px] sm:min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search concepts..."
            value={filters.searchTerm}
            onChange={(e) => onFilterChange({ searchTerm: e.target.value })}
            className="h-8 pl-8 pr-7 text-xs bg-background"
            data-testid="graph-search-input"
          />
          {filters.searchTerm && (
            <button
              type="button"
              onClick={() => onFilterChange({ searchTerm: '' })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* PACER Filter */}
        <div className="flex items-center">
          <select
            value={filters.pacerFilter}
            onChange={(e) => onFilterChange({ pacerFilter: e.target.value })}
            aria-label="Filter by PACER category"
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            data-testid="graph-pacer-filter"
          >
            <option value="all">All PACER Types</option>
            {Object.entries(PACER_CATEGORY_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
        </div>

        {/* Material Filter */}
        <div className="flex items-center">
          <select
            value={filters.materialFilter}
            onChange={(e) => onFilterChange({ materialFilter: e.target.value })}
            aria-label="Filter by Source Material"
            className="h-8 max-w-[160px] truncate rounded-md border border-input bg-background px-2.5 text-xs text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            data-testid="graph-material-filter"
          >
            <option value="all">All Materials</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: Layout Toggle, Zoom Controls, Diagnostics, Resync */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Layout Toggle */}
        <div
          className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/60"
          role="tablist"
          aria-label="Graph Layout Projection"
          data-testid="graph-layout-toggle"
        >
          <button
            type="button"
            role="tab"
            aria-selected={layoutMode === 'force'}
            onClick={() => onLayoutChange('force')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
              layoutMode === 'force'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-testid="layout-force-btn"
          >
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">Dynamic Force</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={layoutMode === 'dag'}
            onClick={() => onLayoutChange('dag')}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-all',
              layoutMode === 'dag'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            data-testid="layout-dag-btn"
          >
            <GitFork className="size-3.5" />
            <span className="hidden sm:inline">Hierarchical DAG</span>
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center rounded-lg bg-muted/60 p-0.5 border border-border/60">
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomIn}
            className="size-7 p-0 text-muted-foreground hover:text-foreground"
            title="Zoom In"
            data-testid="graph-zoom-in"
          >
            <ZoomIn className="size-3.5" />
            <span className="sr-only">Zoom In</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onZoomOut}
            className="size-7 p-0 text-muted-foreground hover:text-foreground"
            title="Zoom Out"
            data-testid="graph-zoom-out"
          >
            <ZoomOut className="size-3.5" />
            <span className="sr-only">Zoom Out</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onFitView}
            className="size-7 p-0 text-muted-foreground hover:text-foreground"
            title="Fit to View"
            data-testid="graph-fit-view"
          >
            <Maximize2 className="size-3.5" />
            <span className="sr-only">Fit to View</span>
          </Button>
        </div>

        {/* Re-sync Graph */}
        <Button
          variant="outline"
          size="sm"
          onClick={onResync}
          disabled={isResyncing}
          className="h-8 gap-1.5 text-xs"
          data-testid="graph-resync-button"
        >
          <RefreshCw className={cn('size-3.5', isResyncing && 'animate-spin')} />
          <span className="hidden sm:inline">Re-sync</span>
        </Button>

        {/* Diagnostics badges */}
        {diagnostics && (
          <div className="hidden lg:flex items-center gap-1.5 pl-1 text-xs text-muted-foreground">
            <Badge variant="secondary" className="font-normal text-[11px] h-6">
              {diagnostics.totalComponents} concepts
            </Badge>
            <Badge variant="secondary" className="font-normal text-[11px] h-6">
              {diagnostics.totalDependencies} links
            </Badge>
            {diagnostics.hasCycles && (
              <Badge variant="destructive" className="font-normal text-[11px] h-6 gap-1">
                <AlertTriangle className="size-3" />
                <span>Cycles detected</span>
              </Badge>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
