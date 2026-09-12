'use client';

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Layers,
  Loader2,
  Network,
  RefreshCw,
  Search,
  Trash2,
  Upload,
  UploadCloud,
  X,
} from 'lucide-react';
import type React from 'react';
import { type ChangeEvent, type DragEvent, useMemo, useRef, useState } from 'react';
import { DeleteMaterialDialog } from '@/components/document/delete-material-dialog';
import { MaterialFileIcon } from '@/components/document/material-icon';
import { MaterialPreviewDialog } from '@/components/document/material-preview-dialog';
import { MaterialUploadDialog } from '@/components/document/material-upload-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { type MaterialItem, useMaterials } from '@/lib/hooks/use-materials';
import { isMaterialExtractingGraph } from '@/lib/materials/types';
import {
  ACCEPTED_FILE_TYPES_STRING,
  formatFileSize,
  validateMaterialFile,
} from '@/lib/materials/validation';
import { cn } from '@/lib/utils';

export type MaterialWorkbenchProps = {
  projectId: string;
  className?: string;
};

export type SortField = 'title' | 'createdAt' | 'status' | 'chunks';
export type SortOrder = 'asc' | 'desc';
export type StatusFilter = 'all' | 'ready' | 'processing' | 'pending' | 'failed';

export type WorkbenchFilterState = {
  searchTerm: string;
  statusFilter: StatusFilter;
  sortField: SortField;
  sortOrder: SortOrder;
};

type UploadQueueItem = {
  id: string;
  name: string;
  size: number;
  status: 'queued' | 'uploading' | 'ready' | 'error';
  errorMessage?: string;
};

function renderFileIcon(material: MaterialItem): React.JSX.Element {
  return (
    <MaterialFileIcon
      fileType={material.fileType}
      filename={material.filename}
      className="size-4"
    />
  );
}

function getIngestionStageLabel(stage?: string): string {
  switch (stage) {
    case 'downloading':
      return 'Downloading material';
    case 'rasterizing':
      return 'Rasterizing';
    case 'extracting_vision':
      return 'Transcribing Vision';
    case 'chunking':
      return 'Semantic Chunking';
    case 'embedding':
      return 'Generating Embeddings';
    case 'persisting':
      return 'Persisting Chunks';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Ingestion Failed';
    default:
      return 'Processing';
  }
}

function filterAndSortMaterials(
  materials: MaterialItem[],
  filters: WorkbenchFilterState,
): MaterialItem[] {
  const query = filters.searchTerm.trim().toLowerCase();

  const filtered = materials.filter((m) => {
    if (filters.statusFilter !== 'all' && m.status !== filters.statusFilter) return false;
    if (query) {
      return m.title.toLowerCase().includes(query) || m.filename.toLowerCase().includes(query);
    }
    return true;
  });

  return filtered.sort((a, b) => {
    let cmp = 0;
    if (filters.sortField === 'title') {
      cmp = a.title.localeCompare(b.title);
    } else if (filters.sortField === 'status') {
      cmp = a.status.localeCompare(b.status);
    } else if (filters.sortField === 'chunks') {
      cmp = (a.metadata?.chunkCount ?? 0) - (b.metadata?.chunkCount ?? 0);
    } else {
      cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    return filters.sortOrder === 'asc' ? cmp : -cmp;
  });
}

async function triggerConceptExtraction(projectId: string, materialIds?: string[]): Promise<void> {
  const body = materialIds && materialIds.length > 0 ? { materialIds } : {};
  const response = await fetch(`/api/projects/${projectId}/graph/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.cause || errorJson.message || 'Failed to extract concepts');
  }
}

async function uploadSingleWorkbenchFile(projectId: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

  const response = await fetch(`/api/projects/${projectId}/materials`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.message || 'Upload failed');
  }
}

async function uploadAndTrackFile(
  projectId: string,
  file: File,
  itemId: string,
  setQueue: React.Dispatch<React.SetStateAction<UploadQueueItem[]>>,
): Promise<void> {
  setQueue((prev) =>
    prev.map((item) => (item.id === itemId ? { ...item, status: 'uploading' } : item)),
  );

  try {
    await uploadSingleWorkbenchFile(projectId, file);
    setQueue((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, status: 'ready' } : item)),
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Upload failed';
    setQueue((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: 'error', errorMessage: msg } : item,
      ),
    );
  }
}

function WorkbenchDropzone({
  onFilesSelected,
}: {
  onFilesSelected: (files: File[]) => void;
}): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) {
      onFilesSelected(files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onFilesSelected(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <button
      type="button"
      className={cn(
        'relative flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200 cursor-pointer bg-card/40',
        isDragOver
          ? 'border-primary bg-primary/5 text-primary scale-[1.005]'
          : 'border-border/80 hover:border-primary/50 hover:bg-muted/30',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      data-testid="workbench-dropzone"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES_STRING}
        className="hidden"
        onChange={handleInputChange}
        data-testid="workbench-file-input"
      />
      <div className="flex size-11 items-center justify-center rounded-full bg-muted/80 shadow-xs">
        <UploadCloud className="size-5 text-primary" />
      </div>
      <div className="flex flex-col gap-0.5 max-w-sm">
        <p className="font-semibold text-xs text-foreground">
          Drag & drop materials here, or click to browse
        </p>
        <p className="text-[11px] text-muted-foreground">
          Supports PDF, Markdown, Plain Text, and Slide Images (up to 25MB each). Multiple files are
          queued immediately.
        </p>
      </div>
    </button>
  );
}

function WorkbenchUploadQueueView({
  queue,
  isUploading,
  onClear,
}: {
  queue: UploadQueueItem[];
  isUploading: boolean;
  onClear: () => void;
}): React.JSX.Element | null {
  if (queue.length === 0) return null;

  return (
    <div
      className="w-full flex flex-col gap-1.5 rounded-lg border border-border/70 bg-card p-3"
      data-testid="workbench-upload-queue"
    >
      <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
        <span>
          {`Upload Queue (${queue.length} items)`}
          {isUploading && ' • Processing...'}
        </span>
        {!isUploading && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-foreground"
            onClick={onClear}
          >
            Clear Queue
          </Button>
        )}
      </div>
      <div className="flex flex-col gap-1 max-h-36 overflow-y-auto pr-1">
        {queue.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-muted/20 p-2 text-xs"
            data-testid={`queue-item-${item.id}`}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <FileText className="size-3.5 text-muted-foreground shrink-0" />
              <span className="truncate font-medium text-[11px] text-foreground">{item.name}</span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {formatFileSize(item.size)}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {item.status === 'uploading' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 text-primary">
                  <Loader2 className="size-3 animate-spin" />
                  <span>Uploading</span>
                </Badge>
              )}
              {item.status === 'ready' && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2 className="size-3" />
                  <span>Ready</span>
                </Badge>
              )}
              {item.status === 'error' && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-1">
                  <AlertCircle className="size-3" />
                  <span>{item.errorMessage || 'Error'}</span>
                </Badge>
              )}
              {item.status === 'queued' && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  Queued
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function IngestionStatusCell({ material }: { material: MaterialItem }): React.JSX.Element {
  const progress = material.metadata?.progress;

  if (material.status === 'processing') {
    return (
      <div className="flex flex-col gap-1.5" data-testid={`ingestion-stage-${material.id}`}>
        <div className="flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin text-blue-500 shrink-0" />
          <span className="font-medium text-blue-600 dark:text-blue-400 text-xs">
            {getIngestionStageLabel(progress?.stage)}
          </span>
          {progress?.stagePercent !== undefined && (
            <span className="text-[10px] text-muted-foreground">
              {`(${progress.stagePercent}%)`}
            </span>
          )}
        </div>

        {progress?.currentPage !== undefined && progress?.totalPages !== undefined && (
          <span className="text-[10px] text-muted-foreground">
            {`Page ${progress.currentPage} of ${progress.totalPages}`}
          </span>
        )}

        {progress?.stagePercent !== undefined && (
          <Progress
            value={progress.stagePercent}
            className="h-1.5 w-32 bg-blue-100 dark:bg-blue-950"
          />
        )}
      </div>
    );
  }

  if (material.status === 'ready') {
    return (
      <div className="flex items-center gap-1.5">
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 text-[11px] px-2 py-0.5"
        >
          <Check className="size-3" />
          <span>Ready</span>
        </Badge>
      </div>
    );
  }

  if (material.status === 'failed') {
    return (
      <div className="flex flex-col gap-1" data-testid={`material-status-failed-${material.id}`}>
        <Badge variant="destructive" className="w-fit gap-1 text-[11px] px-2 py-0.5">
          <AlertCircle className="size-3" />
          <span>Failed</span>
        </Badge>
        <span className="text-[10px] text-destructive max-w-xs truncate">
          {material.metadata?.error?.message || material.errorMessage || 'Ingestion failed'}
        </span>
      </div>
    );
  }

  return (
    <Badge variant="secondary" className="gap-1 text-[11px] px-2 py-0.5 text-muted-foreground">
      <Clock className="size-3" />
      <span>Queued</span>
    </Badge>
  );
}

function KnowledgeChunksCell({
  material,
  isExtracting,
}: {
  material: MaterialItem;
  isExtracting: boolean;
}): React.JSX.Element {
  const graphMetadata = material.metadata?.graphExtraction;
  const chunkCount = material.metadata?.chunkCount;
  const tokenCount = material.metadata?.tokenCount;
  const pageCount = material.metadata?.pageCount;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        {chunkCount !== undefined && (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {`${chunkCount} Chunks`}
          </Badge>
        )}
        {tokenCount !== undefined && tokenCount > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
            {`${tokenCount.toLocaleString()} tokens`}
          </Badge>
        )}
        {pageCount !== undefined && pageCount > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground">
            {`${pageCount} ${pageCount === 1 ? 'page' : 'pages'}`}
          </Badge>
        )}
      </div>

      {isExtracting ? (
        <div
          className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium text-[11px]"
          data-testid={`graph-extracting-${material.id}`}
        >
          <Loader2 className="size-3 animate-spin" />
          <span>Extracting Graph...</span>
        </div>
      ) : graphMetadata?.status === 'ready' || graphMetadata?.status === 'ready_with_warnings' ? (
        <div className="flex items-center gap-1.5 pt-0.5">
          <Badge
            variant="outline"
            className="border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[10px] px-1.5 py-0"
          >
            {`${graphMetadata.kcCount ?? 0} KCs`}
          </Badge>
          <Badge
            variant="outline"
            className="border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[10px] px-1.5 py-0"
          >
            {`${graphMetadata.exerciseCount ?? 0} Exercises`}
          </Badge>
        </div>
      ) : null}
    </div>
  );
}

function MaterialTableRow({
  material,
  isExtracting,
  onInspect,
  onExtract,
  onDelete,
}: {
  material: MaterialItem;
  isExtracting: boolean;
  onInspect: (id: string) => void;
  onExtract: (id: string) => void;
  onDelete: (material: MaterialItem) => void;
}): React.JSX.Element {
  return (
    <tr
      className="hover:bg-muted/30 transition-colors"
      data-testid={`workbench-row-${material.id}`}
    >
      <td className="py-3 px-4">
        <div className="flex items-start gap-2.5 min-w-[200px] max-w-xs">
          <div className="pt-0.5">{renderFileIcon(material)}</div>
          <div className="flex flex-col min-w-0">
            <button
              type="button"
              className="text-left font-semibold text-foreground truncate hover:underline cursor-pointer"
              onClick={() => onInspect(material.id)}
              title={material.title}
            >
              {material.title}
            </button>
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
              <span className="truncate">{material.filename}</span>
              <span>•</span>
              <span>{formatFileSize(material.fileSize)}</span>
            </div>
          </div>
        </div>
      </td>

      <td className="py-3 px-4 min-w-[220px]">
        <IngestionStatusCell material={material} />
      </td>

      <td className="py-3 px-4 min-w-[200px]">
        <KnowledgeChunksCell material={material} isExtracting={isExtracting} />
      </td>

      <td className="py-3 px-4 text-muted-foreground text-[11px] whitespace-nowrap">
        {new Date(material.createdAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </td>

      <td className="py-3 px-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1 hover:text-foreground"
            onClick={() => onInspect(material.id)}
            data-testid={`inspect-material-btn-${material.id}`}
            title="Inspect Chunks and Extracted Content"
          >
            <Layers className="size-3 text-primary" />
            <span>Inspect Chunks</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1 hover:text-purple-600 dark:hover:text-purple-400"
            onClick={() => onExtract(material.id)}
            disabled={material.status !== 'ready' || isExtracting}
            data-testid={`extract-concepts-btn-${material.id}`}
            title="Extract Knowledge Components and Grounded Exercises"
          >
            {isExtracting ? (
              <Loader2 className="size-3 animate-spin text-purple-500" />
            ) : (
              <Network className="size-3 text-purple-500" />
            )}
            <span>Extract Concepts</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px] gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            onClick={() => onDelete(material)}
            data-testid={`delete-material-btn-${material.id}`}
            title="Delete Material and Cascade Chunks"
          >
            <Trash2 className="size-3" />
            <span>Delete</span>
          </Button>
        </div>
      </td>
    </tr>
  );
}

function TableSortHeader({
  label,
  field,
  currentSortField,
  currentSortOrder,
  onSort,
}: {
  label: string;
  field: SortField;
  currentSortField: SortField;
  currentSortOrder: SortOrder;
  onSort: (field: SortField) => void;
}): React.JSX.Element {
  const isActive = currentSortField === field;

  return (
    <th className="py-3 px-4">
      <button
        type="button"
        className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
        onClick={() => onSort(field)}
      >
        <span>{label}</span>
        {isActive ? (
          currentSortOrder === 'asc' ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-40" />
        )}
      </button>
    </th>
  );
}

function WorkbenchMaterialsTable({
  materials,
  sortField,
  sortOrder,
  extractingMap,
  onSort,
  onInspect,
  onExtract,
  onDelete,
}: {
  materials: MaterialItem[];
  sortField: SortField;
  sortOrder: SortOrder;
  extractingMap: Record<string, boolean>;
  onSort: (field: SortField) => void;
  onInspect: (id: string) => void;
  onExtract: (id: string) => void;
  onDelete: (material: MaterialItem) => void;
}): React.JSX.Element {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/70 bg-card shadow-xs">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="border-b border-border/70 bg-muted/40 text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            <TableSortHeader
              label="Material"
              field="title"
              currentSortField={sortField}
              currentSortOrder={sortOrder}
              onSort={onSort}
            />
            <TableSortHeader
              label="Ingestion Status"
              field="status"
              currentSortField={sortField}
              currentSortOrder={sortOrder}
              onSort={onSort}
            />
            <TableSortHeader
              label="Knowledge & Chunks"
              field="chunks"
              currentSortField={sortField}
              currentSortOrder={sortOrder}
              onSort={onSort}
            />
            <TableSortHeader
              label="Date Added"
              field="createdAt"
              currentSortField={sortField}
              currentSortOrder={sortOrder}
              onSort={onSort}
            />
            <th className="py-3 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {materials.map((material) => (
            <MaterialTableRow
              key={material.id}
              material={material}
              isExtracting={
                isMaterialExtractingGraph(material.metadata) || Boolean(extractingMap[material.id])
              }
              onInspect={onInspect}
              onExtract={onExtract}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkbenchHeaderToolbar({
  totalCount,
  readyCount,
  processingCount,
  failedCount,
  isSyncing,
  onSyncGraph,
  onOpenUpload,
}: {
  totalCount: number;
  readyCount: number;
  processingCount: number;
  failedCount: number;
  isSyncing: boolean;
  onSyncGraph: () => void;
  onOpenUpload: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/80 pb-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">Materials Workbench</h1>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs px-2 py-0.5 font-normal">
              {`${totalCount} Total`}
            </Badge>
            {readyCount > 0 && (
              <Badge
                variant="outline"
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs px-2 py-0.5 font-normal"
              >
                {`${readyCount} Ready`}
              </Badge>
            )}
            {processingCount > 0 && (
              <Badge
                variant="outline"
                className="border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs px-2 py-0.5 font-normal gap-1 animate-pulse"
              >
                <Loader2 className="size-3 animate-spin" />
                <span>{`${processingCount} Ingesting`}</span>
              </Badge>
            )}
            {failedCount > 0 && (
              <Badge variant="destructive" className="text-xs px-2 py-0.5 font-normal">
                {`${failedCount} Failed`}
              </Badge>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Upload, inspect, and manage learning materials, ingestion pipelines, and knowledge chunks.
        </p>
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onSyncGraph}
          disabled={isSyncing}
          className="h-9 gap-1.5 px-3.5 text-xs font-medium shadow-xs"
          data-testid="workbench-sync-graph-button"
        >
          {isSyncing ? (
            <Loader2 className="size-3.5 animate-spin text-primary" />
          ) : (
            <RefreshCw className="size-3.5 text-primary" />
          )}
          <span>Sync Graph</span>
        </Button>

        <Button
          variant="default"
          size="sm"
          onClick={onOpenUpload}
          className="h-9 gap-1.5 px-3.5 text-xs font-medium shadow-xs"
          data-testid="workbench-upload-button"
        >
          <Upload className="size-3.5" />
          <span>Upload Material</span>
        </Button>
      </div>
    </div>
  );
}

function WorkbenchFilterControls({
  filters,
  onFiltersChange,
}: {
  filters: WorkbenchFilterState;
  onFiltersChange: (updater: (prev: WorkbenchFilterState) => WorkbenchFilterState) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-muted/20 p-3 rounded-lg border border-border/60">
      <div className="flex flex-1 items-center gap-2 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title or filename..."
            value={filters.searchTerm}
            onChange={(e) => onFiltersChange((prev) => ({ ...prev, searchTerm: e.target.value }))}
            className="h-8 pl-8 text-xs bg-background"
            data-testid="workbench-search-input"
          />
          {filters.searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 size-6 text-muted-foreground hover:text-foreground"
              onClick={() => onFiltersChange((prev) => ({ ...prev, searchTerm: '' }))}
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Status:</span>
          <select
            value={filters.statusFilter}
            onChange={(e) =>
              onFiltersChange((prev) => ({
                ...prev,
                statusFilter: e.target.value as StatusFilter,
              }))
            }
            className="h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            data-testid="workbench-status-filter"
          >
            <option value="all">All Statuses</option>
            <option value="ready">Ready</option>
            <option value="processing">Processing</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span>Sort:</span>
          <select
            value={`${filters.sortField}-${filters.sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [SortField, SortOrder];
              onFiltersChange((prev) => ({ ...prev, sortField: field, sortOrder: order }));
            }}
            className="h-8 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            data-testid="workbench-sort-select"
          >
            <option value="createdAt-desc">Date (Newest First)</option>
            <option value="createdAt-asc">Date (Oldest First)</option>
            <option value="title-asc">Title (A to Z)</option>
            <option value="title-desc">Title (Z to A)</option>
            <option value="status-asc">Status</option>
            <option value="chunks-desc">Chunks (High to Low)</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function WorkbenchEmptyState({ onOpenUpload }: { onOpenUpload: () => void }): React.JSX.Element {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 p-12 text-center bg-card/30"
      data-testid="material-workbench-empty"
    >
      <div className="flex size-12 items-center justify-center rounded-full bg-muted mb-3">
        <FileText className="size-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">No learning materials uploaded yet</h3>
      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
        Drag and drop study materials above or click "Upload Material" to trigger automated
        chunking, vision transcription, and concept graph extraction.
      </p>
      <Button variant="outline" size="sm" onClick={onOpenUpload} className="mt-4 gap-1.5 text-xs">
        <Upload className="size-3.5" />
        <span>Upload Material</span>
      </Button>
    </div>
  );
}

function WorkbenchNoMatchesState({ onClear }: { onClear: () => void }): React.JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 p-8 text-center bg-card/20">
      <p className="text-xs font-medium text-foreground">No materials match your filter criteria</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        Try adjusting your search query or reset status filters.
      </p>
      <Button variant="ghost" size="sm" onClick={onClear} className="mt-3 text-xs">
        Clear Filters
      </Button>
    </div>
  );
}

export function MaterialWorkbench({
  projectId,
  className,
}: MaterialWorkbenchProps): React.JSX.Element {
  const [filters, setFilters] = useState<WorkbenchFilterState>({
    searchTerm: '',
    statusFilter: 'all',
    sortField: 'createdAt',
    sortOrder: 'desc',
  });

  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewMaterialId, setPreviewMaterialId] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteTargetMaterial, setDeleteTargetMaterial] = useState<MaterialItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Drag & drop queue state
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isQueueUploading, setIsQueueUploading] = useState(false);

  // Action states
  const [isSyncingGraph, setIsSyncingGraph] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [extractingMap, setExtractingMap] = useState<Record<string, boolean>>({});

  const { materials, isLoading, mutate } = useMaterials(projectId);

  const isAnyExtractingGraph = materials.some(isMaterialExtractingGraph);

  const totalCount = materials.length;
  const readyCount = materials.filter((m) => m.status === 'ready').length;
  const processingCount = materials.filter(
    (m) => m.status === 'processing' || m.status === 'pending',
  ).length;
  const failedCount = materials.filter((m) => m.status === 'failed').length;

  const filteredMaterials = useMemo(() => {
    return filterAndSortMaterials(materials, filters);
  }, [materials, filters]);

  const toggleSort = (field: SortField) => {
    setFilters((prev) => {
      if (prev.sortField === field) {
        return { ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' };
      }
      return { ...prev, sortField: field, sortOrder: 'asc' };
    });
  };

  const handleInspect = (materialId: string) => {
    setPreviewMaterialId(materialId);
    setPreviewDialogOpen(true);
  };

  const handleDeletePrompt = (material: MaterialItem) => {
    setDeleteTargetMaterial(material);
    setDeleteDialogOpen(true);
  };

  const handleSyncGraph = async () => {
    setIsSyncingGraph(true);
    setActionError(null);
    try {
      await triggerConceptExtraction(projectId);
      await mutate();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to synchronize graph');
    } finally {
      setIsSyncingGraph(false);
    }
  };

  const handleExtractConcepts = async (materialId: string) => {
    setActionError(null);
    setExtractingMap((prev) => ({ ...prev, [materialId]: true }));
    try {
      await triggerConceptExtraction(projectId, [materialId]);
      await mutate();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to extract concepts');
    } finally {
      setExtractingMap((prev) => ({ ...prev, [materialId]: false }));
    }
  };

  const processFilesForUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const stagedEntries = files.map((file) => {
      const validation = validateMaterialFile(file);
      const queueItem: UploadQueueItem = {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        size: file.size,
        status: validation.valid ? 'queued' : 'error',
        errorMessage: validation.error,
      };
      return { file, queueItem, valid: validation.valid };
    });

    setUploadQueue((prev) => [...prev, ...stagedEntries.map((e) => e.queueItem)]);
    setIsQueueUploading(true);

    for (const entry of stagedEntries) {
      if (entry.valid) {
        await uploadAndTrackFile(projectId, entry.file, entry.queueItem.id, setUploadQueue);
      }
    }

    setIsQueueUploading(false);
    await mutate();
  };

  return (
    <div
      className={cn('flex flex-col h-full w-full overflow-y-auto p-6 gap-5', className)}
      data-testid="material-workbench"
    >
      {/* 1. Header Toolbar */}
      <WorkbenchHeaderToolbar
        totalCount={totalCount}
        readyCount={readyCount}
        processingCount={processingCount}
        failedCount={failedCount}
        isSyncing={isAnyExtractingGraph || isSyncingGraph}
        onSyncGraph={handleSyncGraph}
        onOpenUpload={() => setUploadDialogOpen(true)}
      />

      {/* Action Error Alert */}
      {actionError && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0" />
            <span>{actionError}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-destructive hover:bg-destructive/20"
            onClick={() => setActionError(null)}
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* 2. Drag & Drop Upload Zone */}
      <div className="flex flex-col gap-3">
        <WorkbenchDropzone onFilesSelected={processFilesForUpload} />
        <WorkbenchUploadQueueView
          queue={uploadQueue}
          isUploading={isQueueUploading}
          onClear={() => setUploadQueue([])}
        />
      </div>

      {/* 3. Search, Filter & Sort Controls */}
      <WorkbenchFilterControls filters={filters} onFiltersChange={setFilters} />

      {/* 4. Loading Skeletons */}
      {isLoading && (
        <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-card p-4">
          <div className="h-6 w-full animate-pulse rounded bg-muted/40" />
          <div className="h-12 w-full animate-pulse rounded bg-muted/30" />
          <div className="h-12 w-full animate-pulse rounded bg-muted/30" />
          <div className="h-12 w-full animate-pulse rounded bg-muted/30" />
        </div>
      )}

      {/* 5. Empty State */}
      {!isLoading && materials.length === 0 && (
        <WorkbenchEmptyState onOpenUpload={() => setUploadDialogOpen(true)} />
      )}

      {/* 6. Filtered Out Empty State */}
      {!isLoading && materials.length > 0 && filteredMaterials.length === 0 && (
        <WorkbenchNoMatchesState
          onClear={() => {
            setFilters((prev) => ({ ...prev, searchTerm: '', statusFilter: 'all' }));
          }}
        />
      )}

      {/* 7. Materials Table */}
      {!isLoading && filteredMaterials.length > 0 && (
        <WorkbenchMaterialsTable
          materials={filteredMaterials}
          sortField={filters.sortField}
          sortOrder={filters.sortOrder}
          extractingMap={extractingMap}
          onSort={toggleSort}
          onInspect={handleInspect}
          onExtract={handleExtractConcepts}
          onDelete={handleDeletePrompt}
        />
      )}

      {/* Upload Dialog */}
      <MaterialUploadDialog
        projectId={projectId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadSuccess={() => mutate()}
      />

      {/* Ingestion Preview / Inspection Dialog */}
      <MaterialPreviewDialog
        projectId={projectId}
        materialId={previewMaterialId}
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
      />

      {/* Cascade Deletion Confirmation Dialog */}
      <DeleteMaterialDialog
        projectId={projectId}
        material={deleteTargetMaterial}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={() => mutate()}
      />
    </div>
  );
}
