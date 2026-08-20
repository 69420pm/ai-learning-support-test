'use client';

import { AlertCircle, ChevronDown, ChevronUp, FileText, Loader2, Search } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type MaterialSearchResult = {
  materialId?: string;
  materialTitle: string;
  pageNumber?: number;
  chunkIndex?: number;
  similarity: number;
  content: string;
};

export type MaterialSearchWidgetProps = {
  query?: string;
  status?: 'searching' | 'completed' | 'error';
  results?: MaterialSearchResult[];
  error?: string;
  className?: string;
  defaultExpanded?: boolean;
};

export function getMatchBadgeClass(similarity: number): string {
  const pct = Math.round(similarity * 100);
  if (pct >= 70) {
    return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
  }
  if (pct >= 50) {
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30';
  }
  return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30';
}

type MaterialSearchCardProps = {
  result: MaterialSearchResult;
  index: number;
  isOpen: boolean;
  onToggle: (index: number, e: React.MouseEvent) => void;
};

function MaterialSearchCard({ result, index, isOpen, onToggle }: MaterialSearchCardProps) {
  const matchPct = Math.round(result.similarity * 100);
  const pageLabel = result.pageNumber
    ? `Page ${result.pageNumber}`
    : `Chunk ${(result.chunkIndex ?? 0) + 1}`;

  return (
    <div className="rounded-lg border border-border/60 bg-background/80 p-2.5 shadow-2xs transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <FileText className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="font-semibold text-foreground truncate">{result.materialTitle}</span>
          <Badge
            variant="outline"
            className="shrink-0 text-[10px] px-1.5 py-0 text-muted-foreground bg-muted/50"
          >
            {pageLabel}
          </Badge>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={cn(
              'rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              getMatchBadgeClass(result.similarity),
            )}
          >
            {`${matchPct}% match`}
          </span>

          <button
            type="button"
            onClick={(e) => onToggle(index, e)}
            aria-label={isOpen ? 'Collapse excerpt' : 'Expand excerpt'}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-1.5 py-0.5 rounded transition-colors"
          >
            <span>{isOpen ? 'Hide' : 'Preview'}</span>
            {isOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-2 rounded-md bg-muted/50 p-2.5 border border-border/40 text-xs text-foreground/90 font-mono leading-relaxed whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
          {result.content}
        </div>
      )}
    </div>
  );
}

type HeaderContentProps = {
  status: 'searching' | 'completed' | 'error';
  query: string;
  resultsCount: number;
  error?: string;
};

function MaterialSearchHeaderContent({ status, query, resultsCount, error }: HeaderContentProps) {
  if (status === 'searching') {
    return (
      <span className="font-medium text-foreground">
        Searching project materials for{' '}
        <span className="font-mono text-primary italic">"{query || 'relevant concepts'}"</span>
        ...
      </span>
    );
  }

  if (status === 'error') {
    return (
      <span className="font-medium text-destructive">
        {`Material search failed${error ? `: ${error}` : ''}`}
      </span>
    );
  }

  const hasResults = resultsCount > 0;
  return (
    <div className="flex items-center gap-2 flex-wrap truncate">
      <span className="font-medium text-foreground">
        {hasResults
          ? `Found ${resultsCount} relevant source${resultsCount === 1 ? '' : 's'}`
          : 'No relevant materials found'}
      </span>
      {query && (
        <span className="text-muted-foreground truncate">
          for <span className="font-mono text-foreground/90">"{query}"</span>
        </span>
      )}
    </div>
  );
}

function MaterialSearchHeaderIcon({ status }: { status: 'searching' | 'completed' | 'error' }) {
  if (status === 'searching') {
    return <Loader2 className="size-4 shrink-0 animate-spin text-primary" />;
  }
  if (status === 'error') {
    return <AlertCircle className="size-4 shrink-0 text-destructive" />;
  }
  return <Search className="size-4 shrink-0 text-primary/80" />;
}

export function MaterialSearchWidget({
  query = '',
  status = 'completed',
  results = [],
  error,
  className,
  defaultExpanded = false,
}: MaterialSearchWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  const toggleCard = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCards((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const isSearching = status === 'searching';
  const isError = status === 'error';
  const hasResults = results.length > 0;

  return (
    <div
      data-testid="material-search-widget"
      className={cn(
        'my-2 w-full overflow-hidden rounded-xl border text-xs transition-all duration-200 shadow-xs',
        isSearching && 'border-primary/30 bg-primary/5',
        isError && 'border-destructive/30 bg-destructive/5',
        !isSearching && !isError && 'border-border/70 bg-card/60 backdrop-blur-xs',
        className,
      )}
    >
      {/* Header / Summary Bar */}
      <button
        type="button"
        onClick={() => {
          if (!isSearching) {
            setIsExpanded((prev) => !prev);
          }
        }}
        aria-expanded={isExpanded}
        className={cn(
          'flex w-full items-center justify-between gap-2.5 px-3.5 py-2.5 text-left transition-colors',
          !isSearching && 'hover:bg-muted/50 cursor-pointer',
          isSearching && 'cursor-default',
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <MaterialSearchHeaderIcon status={status} />
          <div className="flex items-center gap-2 truncate">
            <MaterialSearchHeaderContent
              status={status}
              query={query}
              resultsCount={results.length}
              error={error}
            />
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isSearching && !isError && hasResults && (
            <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0.5">
              {results.length} {results.length === 1 ? 'source' : 'sources'}
            </Badge>
          )}

          {!isSearching && !isError && hasResults && (
            <div className="text-muted-foreground transition-transform duration-200">
              {isExpanded ? (
                <ChevronUp className="size-3.5" />
              ) : (
                <ChevronDown className="size-3.5" />
              )}
            </div>
          )}
        </div>
      </button>

      {/* Collapsible Content / Source Cards */}
      {isExpanded && !isSearching && !isError && (
        <div className="border-t border-border/50 bg-muted/20 px-3.5 py-3">
          {hasResults ? (
            <div className="flex flex-col gap-2.5">
              {results.map((result, idx) => {
                const cardKey = `${result.materialTitle}-${result.chunkIndex ?? idx}`;
                return (
                  <MaterialSearchCard
                    key={cardKey}
                    result={result}
                    index={idx}
                    isOpen={expandedCards[idx] ?? false}
                    onToggle={toggleCard}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-1 text-center">
              No matching material chunks found above the 40% similarity threshold.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
