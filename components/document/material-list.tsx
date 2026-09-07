'use client';

import {
  ExternalLink,
  FileCode,
  FileImage,
  FileText,
  FolderKanban,
  Loader2,
  MoreVertical,
  Network,
  RefreshCw,
  Trash2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';

import { type ChangeEvent, useRef, useState } from 'react';
import { DeleteMaterialDialog } from '@/components/document/delete-material-dialog';
import { MaterialPreviewDialog } from '@/components/document/material-preview-dialog';
import { MaterialUploadDialog } from '@/components/document/material-upload-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type MaterialItem, type MaterialStatus, useMaterials } from '@/lib/hooks/use-materials';
import { isMaterialExtractingGraph } from '@/lib/materials/types';
import { ACCEPTED_FILE_TYPES_STRING, getFileIconType } from '@/lib/materials/validation';
import { cn } from '@/lib/utils';

export type { MaterialItem, MaterialStatus } from '@/lib/hooks/use-materials';

export type MaterialListProps = {
  projectId: string;
  className?: string;
  showNavigationLinks?: boolean;
  showSyncGraph?: boolean;
};

function getStatusDot(status: MaterialStatus, stage?: string) {
  switch (status) {
    case 'ready':
      return (
        <span
          className="flex items-center justify-center p-0.5 text-emerald-500"
          title="Status: Ready"
          data-testid="material-status-ready"
        >
          <span className="size-2 rounded-full bg-emerald-500" />
        </span>
      );
    case 'processing':
      return (
        <span
          className="flex items-center justify-center p-0.5 text-blue-500"
          title={stage ? `Processing: ${stage}` : 'Processing...'}
          data-testid="material-status-processing"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-blue-500" />
          </span>
        </span>
      );
    case 'failed':
      return (
        <span
          className="flex items-center justify-center p-0.5 text-destructive"
          title="Status: Failed"
          data-testid="material-status-failed"
        >
          <span className="size-2 rounded-full bg-destructive" />
        </span>
      );
    default:
      return (
        <span
          className="flex items-center justify-center p-0.5 text-muted-foreground"
          title="Status: Pending"
          data-testid="material-status-pending"
        >
          <span className="size-2 rounded-full bg-muted-foreground/60" />
        </span>
      );
  }
}

const FILE_ICON_CONFIG: Record<string, { icon: typeof FileText; colorClass: string }> = {
  pdf: { icon: FileText, colorClass: 'text-red-500' },
  image: { icon: FileImage, colorClass: 'text-blue-500' },
  markdown: { icon: FileCode, colorClass: 'text-emerald-500' },
  default: { icon: FileText, colorClass: 'text-muted-foreground' },
};

function renderItemIcon(material: MaterialItem) {
  const iconType = getFileIconType(material.fileType, material.filename);
  const config = FILE_ICON_CONFIG[iconType] ?? FILE_ICON_CONFIG.default;
  const IconComponent = config.icon;
  return <IconComponent className={cn('size-3.5 shrink-0', config.colorClass)} />;
}

export function MaterialList({
  projectId,
  className,
  showNavigationLinks = true,
  showSyncGraph = false,
}: MaterialListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewMaterialId, setPreviewMaterialId] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteTargetMaterial, setDeleteTargetMaterial] = useState<MaterialItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);
  const [isSyncingGraph, setIsSyncingGraph] = useState(false);

  const { materials, isLoading, mutate } = useMaterials(projectId);

  const isExtractingGraph = materials.some(isMaterialExtractingGraph);

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
    setExtractError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/graph/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(
          errorJson.cause || errorJson.message || 'Failed to trigger graph synchronization',
        );
      }

      await mutate();
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : 'Failed to synchronize graph');
    } finally {
      setIsSyncingGraph(false);
    }
  };

  const handleExtractConcepts = async (materialId: string) => {
    setExtractError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/graph/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ materialIds: [materialId] }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(
          errorJson.cause || errorJson.message || 'Failed to trigger concept extraction',
        );
      }

      await mutate();
    } catch (err: unknown) {
      setExtractError(err instanceof Error ? err.message : 'Failed to extract concepts');
    }
  };

  // Direct file input handler (fallback / backward compat)
  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^/.]+$/, ''));

    try {
      const response = await fetch(`/api/projects/${projectId}/materials`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Failed to upload material');
      }

      await mutate();
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <>
      <div className={cn('flex flex-col gap-2', className)} data-testid="material-list">
        {/* Header with Upload Action */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 font-semibold text-[11px] text-muted-foreground uppercase tracking-wider">
            <FileText className="size-3.5" />
            <span>Materials</span>
            {materials.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 py-0.2 text-[10px] text-foreground">
                {materials.length}
              </span>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES_STRING}
            className="hidden"
            onChange={handleFileChange}
            data-testid="material-file-input"
          />

          <div className="flex items-center gap-1">
            {showSyncGraph && (
              <Button
                data-testid="sync-graph-button"
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={handleSyncGraph}
                disabled={isExtractingGraph || isSyncingGraph}
              >
                {isExtractingGraph || isSyncingGraph ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                <span>Sync Graph</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setUploadDialogOpen(true)}
              data-testid="upload-material-button"
            >
              <Upload className="size-3" />
              <span>Upload</span>
            </Button>
          </div>
        </div>

        {/* Error Notice */}
        {(uploadError || extractError) && (
          <div className="rounded bg-destructive/10 p-1.5 text-[11px] text-destructive">
            {uploadError || extractError}
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="flex flex-col gap-1.5 px-1 py-1">
            <div className="h-6 animate-pulse rounded bg-muted/40" />
            <div className="h-6 animate-pulse rounded bg-muted/40 w-3/4" />
          </div>
        )}

        {/* Empty List */}
        {!isLoading && materials.length === 0 && (
          <button
            type="button"
            className="w-full rounded border border-dashed border-border/60 p-2 text-center text-[11px] text-muted-foreground cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setUploadDialogOpen(true)}
            data-testid="empty-materials-list"
          >
            No materials uploaded yet. Click to add.
          </button>
        )}

        {/* Materials List */}
        {!isLoading && materials.length > 0 && (
          <div className="flex flex-col gap-1 max-h-52 overflow-y-auto pr-1">
            {materials.map((material) => (
              <div
                key={material.id}
                className="group flex items-center justify-between gap-1.5 rounded-md px-2 py-1 text-xs hover:bg-muted/50 transition-colors"
                data-testid={`material-item-${material.id}`}
              >
                <button
                  type="button"
                  className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer overflow-hidden"
                  onClick={() => handleInspect(material.id)}
                >
                  {renderItemIcon(material)}
                  <span
                    className="truncate font-medium text-foreground text-[11px]"
                    title={material.title}
                  >
                    {material.title}
                  </span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {getStatusDot(material.status, material.metadata?.progress?.stage)}

                  {isMaterialExtractingGraph(material.metadata) && (
                    <span
                      className="flex items-center justify-center p-0.5 text-purple-500"
                      title="Extracting Knowledge Graph"
                      data-testid={`material-extracting-graph-${material.id}`}
                    >
                      <Loader2 className="size-2.5 animate-spin" />
                    </span>
                  )}

                  {/* Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                        aria-label={`Options for ${material.title}`}
                        data-testid={`material-menu-${material.id}`}
                      >
                        <MoreVertical className="size-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 text-xs">
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleInspect(material.id);
                        }}
                        className="gap-1.5 cursor-pointer text-xs"
                        data-testid={`inspect-material-option-${material.id}`}
                      >
                        <ExternalLink className="size-3.5 text-primary" />
                        <span>Inspect Chunks</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExtractConcepts(material.id);
                        }}
                        disabled={
                          material.status !== 'ready' ||
                          isMaterialExtractingGraph(material.metadata)
                        }
                        className="gap-1.5 cursor-pointer text-xs"
                        data-testid={`extract-concepts-option-${material.id}`}
                      >
                        <Network className="size-3.5 text-purple-500" />
                        <span>Extract Concepts</span>
                      </DropdownMenuItem>

                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeletePrompt(material);
                        }}
                        className="gap-1.5 cursor-pointer text-xs text-destructive focus:text-destructive"
                        data-testid={`delete-material-option-${material.id}`}
                      >
                        <Trash2 className="size-3.5" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Navigation Links to Graph and Materials */}
        {showNavigationLinks && (
          <div className="mt-1 flex flex-col gap-0.5 border-t border-border/40 pt-1.5">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-6 w-full justify-start gap-1.5 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              data-testid="sidebar-nav-graph"
            >
              <Link href={`/projects/${projectId}/graph`}>
                <Network className="size-3 text-primary shrink-0" />
                <span className="truncate">Knowledge Graph</span>
              </Link>
            </Button>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-6 w-full justify-start gap-1.5 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
              data-testid="sidebar-nav-materials"
            >
              <Link href={`/projects/${projectId}/materials`}>
                <FolderKanban className="size-3 text-muted-foreground shrink-0" />
                <span className="truncate">Manage Materials</span>
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <MaterialUploadDialog
        projectId={projectId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadSuccess={() => mutate()}
      />

      {/* Ingestion Inspector / Preview Dialog */}
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
    </>
  );
}
