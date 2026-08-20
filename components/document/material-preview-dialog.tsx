'use client';

import {
  AlertCircle,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  FileCode,
  FileImage,
  FileText,
  Hash,
  Layers,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { MaterialItem, MaterialStatus } from '@/lib/hooks/use-materials';
import { formatFileSize, getFileIconType } from '@/lib/materials/validation';
import { fetcher } from '@/lib/utils';

export type MaterialChunkItem = {
  id: string;
  materialId: string;
  projectId: string;
  userId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata?: {
    pageNumber?: number;
    page?: number;
    headings?: string[];
    section?: string;
    [key: string]: unknown;
  };
  createdAt: string | Date;
};

export type MaterialPreviewResponse = {
  material: MaterialItem;
  chunks: MaterialChunkItem[];
  content: string;
};

export type MaterialPreviewDialogProps = {
  projectId: string;
  materialId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const CHUNKS_PER_PAGE = 5;

function getStatusBadge(status: MaterialStatus) {
  switch (status) {
    case 'ready':
      return (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-2 py-0.5"
          data-testid="preview-status-ready"
        >
          <Check className="size-3" />
          <span>Ready</span>
        </Badge>
      );
    case 'processing':
      return (
        <Badge
          variant="outline"
          className="gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 animate-pulse"
          data-testid="preview-status-processing"
        >
          <Loader2 className="size-3 animate-spin" />
          <span>Processing</span>
        </Badge>
      );
    case 'failed':
      return (
        <Badge
          variant="destructive"
          className="gap-1 text-xs px-2 py-0.5"
          data-testid="preview-status-failed"
        >
          <AlertCircle className="size-3" />
          <span>Failed</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="gap-1 text-xs px-2 py-0.5 text-muted-foreground">
          <Clock className="size-3" />
          <span>Pending</span>
        </Badge>
      );
  }
}

function MaterialIcon({ fileType, filename }: { fileType: string; filename: string }) {
  const iconType = getFileIconType(fileType, filename);
  switch (iconType) {
    case 'pdf':
      return <FileText className="size-5 text-red-500" />;
    case 'image':
      return <FileImage className="size-5 text-blue-500" />;
    case 'markdown':
      return <FileCode className="size-5 text-emerald-500" />;
    default:
      return <FileText className="size-5 text-primary" />;
  }
}

function ChunkCard({
  chunk,
  isCopied,
  onCopy,
}: {
  chunk: MaterialChunkItem;
  isCopied: boolean;
  onCopy: (id: string, text: string) => void;
}) {
  const pageNum = chunk.metadata?.pageNumber || chunk.metadata?.page;

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border/80 bg-card p-3.5 shadow-xs"
      data-testid={`chunk-card-${chunk.chunkIndex}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline" className="gap-1 font-mono text-[10px] px-1.5 py-0 bg-muted/50">
            <Hash className="size-2.5" />
            <span>Chunk {chunk.chunkIndex}</span>
          </Badge>

          {pageNum !== undefined && (
            <Badge
              variant="secondary"
              className="text-[10px] px-1.5 py-0 bg-primary/10 text-primary"
              data-testid="chunk-page-badge"
            >
              Page {pageNum}
            </Badge>
          )}

          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 text-muted-foreground">
            {chunk.tokenCount} tokens
          </Badge>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => onCopy(chunk.id, chunk.content)}
          data-testid={`copy-chunk-${chunk.chunkIndex}`}
        >
          {isCopied ? (
            <>
              <Check className="size-3 text-emerald-500" />
              <span className="text-emerald-500 text-[10px]">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </Button>
      </div>

      <div className="rounded-md bg-muted/40 p-2.5 font-mono text-[11px] leading-relaxed text-foreground whitespace-pre-wrap break-words border border-border/40">
        {chunk.content}
      </div>
    </div>
  );
}

function IngestionStatusNotice({ status, stage }: { status: MaterialStatus; stage?: string }) {
  if (status === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
        <AlertCircle className="size-8 text-destructive" />
        <p className="font-medium text-sm text-foreground">Ingestion failed</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          The background ingestion worker was unable to parse this material.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
      <Loader2 className="size-8 animate-spin text-blue-500" />
      <div className="flex flex-col gap-1">
        <p className="font-medium text-sm text-foreground">Material is currently being indexed</p>
        <p className="text-xs text-muted-foreground max-w-sm">
          {stage
            ? `Current stage: ${stage}`
            : 'The background ingestion worker is extracting markdown and generating embeddings.'}
        </p>
      </div>
    </div>
  );
}

function MaterialPreviewHeader({
  material,
  totalChunkCount,
  totalTokens,
}: {
  material?: MaterialItem;
  totalChunkCount: number;
  totalTokens: number;
}) {
  const pageCount = material?.metadata?.pageCount;

  return (
    <div className="border-b border-border/60 p-5 pb-4">
      <DialogHeader className="gap-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 items-center justify-center rounded-lg bg-muted/80 shrink-0">
              {material ? (
                <MaterialIcon fileType={material.fileType} filename={material.filename} />
              ) : (
                <FileText className="size-5 text-primary" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <DialogTitle className="truncate text-base font-semibold" title={material?.title}>
                {material?.title || 'Material Inspector'}
              </DialogTitle>
              <DialogDescription className="truncate text-xs text-muted-foreground font-mono">
                {material?.filename || 'Loading material details...'}
              </DialogDescription>
            </div>
          </div>

          {material && <div className="shrink-0">{getStatusBadge(material.status)}</div>}
        </div>

        {material && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0.5">
              <Layers className="size-3 text-muted-foreground" />
              <span>{totalChunkCount} Chunks</span>
            </Badge>

            {totalTokens > 0 && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0.5">
                <Sparkles className="size-3 text-muted-foreground" />
                <span>{totalTokens.toLocaleString()} Tokens</span>
              </Badge>
            )}

            {pageCount !== undefined && pageCount > 0 && (
              <Badge variant="secondary" className="gap-1 text-[11px] font-normal py-0.5">
                <FileText className="size-3 text-muted-foreground" />
                <span>
                  {pageCount} {pageCount === 1 ? 'Page' : 'Pages'}
                </span>
              </Badge>
            )}

            <Badge
              variant="outline"
              className="text-[11px] font-normal py-0.5 text-muted-foreground"
            >
              {formatFileSize(material.fileSize || 0)}
            </Badge>

            <div className="flex items-center gap-1 text-[11px] text-muted-foreground ml-auto">
              <Calendar className="size-3" />
              <span>{new Date(material.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </DialogHeader>
    </div>
  );
}

function ExtractedContentTab({ content }: { content: string }) {
  return (
    <TabsContent value="content" className="flex-1 overflow-hidden m-0 focus-visible:outline-none">
      <ScrollArea className="h-[48vh] p-5">
        {content ? (
          <div
            className="prose dark:prose-invert max-w-none text-xs leading-relaxed space-y-2"
            data-testid="extracted-content-view"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
            No extracted markdown content available for this material.
          </div>
        )}
      </ScrollArea>
    </TabsContent>
  );
}

function IndexedChunksTab({
  chunks,
  copiedChunkId,
  onCopyChunk,
}: {
  chunks: MaterialChunkItem[];
  copiedChunkId: string | null;
  onCopyChunk: (id: string, text: string) => void;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(chunks.length / CHUNKS_PER_PAGE));
  const paginatedChunks = useMemo(() => {
    const start = (currentPage - 1) * CHUNKS_PER_PAGE;
    return chunks.slice(start, start + CHUNKS_PER_PAGE);
  }, [chunks, currentPage]);

  return (
    <TabsContent
      value="chunks"
      className="flex-1 flex flex-col overflow-hidden m-0 focus-visible:outline-none"
    >
      <ScrollArea className="flex-1 p-5">
        <div className="flex flex-col gap-3" data-testid="indexed-chunks-list">
          {paginatedChunks.map((chunk) => (
            <ChunkCard
              key={chunk.id}
              chunk={chunk}
              isCopied={copiedChunkId === chunk.id}
              onCopy={onCopyChunk}
            />
          ))}

          {chunks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center text-xs text-muted-foreground">
              No indexed vector chunks found.
            </div>
          )}
        </div>
      </ScrollArea>

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border/50 px-5 py-2.5 bg-muted/20">
          <span className="text-xs text-muted-foreground">
            Page {currentPage} of {totalPages} ({chunks.length} total chunks)
          </span>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="size-7 p-0"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              data-testid="prev-chunk-page"
            >
              <ChevronLeft className="size-3.5" />
              <span className="sr-only">Previous Page</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="size-7 p-0"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              data-testid="next-chunk-page"
            >
              <ChevronRight className="size-3.5" />
              <span className="sr-only">Next Page</span>
            </Button>
          </div>
        </div>
      )}
    </TabsContent>
  );
}

export function MaterialPreviewDialog({
  projectId,
  materialId,
  open,
  onOpenChange,
}: MaterialPreviewDialogProps) {
  const [activeTab, setActiveTab] = useState<'content' | 'chunks'>('content');
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  const previewKey =
    open && projectId && materialId ? `/api/projects/${projectId}/materials/${materialId}` : null;

  const { data, error, isLoading } = useSWR<MaterialPreviewResponse>(previewKey, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: (latest) =>
      latest?.material?.status === 'pending' || latest?.material?.status === 'processing'
        ? 2500
        : 0,
  });

  const material = data?.material;
  const chunks = data?.chunks || [];
  const content = data?.content || '';

  const handleCopyChunk = async (chunkId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedChunkId(chunkId);
      setTimeout(() => setCopiedChunkId(null), 2000);
    } catch {
      // Ignore clipboard error
    }
  };

  const totalTokens =
    material?.metadata?.tokenCount ?? chunks.reduce((sum, c) => sum + (c.tokenCount || 0), 0);
  const totalChunkCount = material?.metadata?.chunkCount ?? chunks.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden"
        data-testid="material-preview-dialog"
      >
        <MaterialPreviewHeader
          material={material}
          totalChunkCount={totalChunkCount}
          totalTokens={totalTokens}
        />

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Loading extracted content and chunks...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            <AlertCircle className="size-8 text-destructive" />
            <p className="font-medium text-sm text-foreground">Failed to load material details</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              {error instanceof Error ? error.message : 'An error occurred while fetching material'}
            </p>
          </div>
        )}

        {!isLoading &&
          !error &&
          material &&
          (material.status === 'pending' || material.status === 'processing') &&
          chunks.length === 0 && (
            <IngestionStatusNotice
              status={material.status}
              stage={material.metadata?.progress?.stage}
            />
          )}

        {!isLoading &&
          !error &&
          material &&
          (material.status === 'ready' || chunks.length > 0 || content.length > 0) && (
            <Tabs
              value={activeTab}
              onValueChange={(val) => setActiveTab(val as 'content' | 'chunks')}
              className="flex flex-1 flex-col overflow-hidden"
            >
              <div className="border-b border-border/50 px-5 pt-2">
                <TabsList className="h-8 bg-muted/60 p-0.5">
                  <TabsTrigger
                    value="content"
                    className="text-xs px-3 py-1 gap-1.5"
                    data-testid="tab-extracted-content"
                  >
                    <FileText className="size-3.5" />
                    <span>Extracted Content</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="chunks"
                    className="text-xs px-3 py-1 gap-1.5"
                    data-testid="tab-indexed-chunks"
                  >
                    <Layers className="size-3.5" />
                    <span>Indexed Chunks ({chunks.length})</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <ExtractedContentTab content={content} />

              <IndexedChunksTab
                chunks={chunks}
                copiedChunkId={copiedChunkId}
                onCopyChunk={handleCopyChunk}
              />
            </Tabs>
          )}
      </DialogContent>
    </Dialog>
  );
}
