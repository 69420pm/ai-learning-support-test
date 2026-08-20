'use client';

import {
  AlertCircle,
  Check,
  Clock,
  ExternalLink,
  FileCode,
  FileImage,
  FileText,
  Loader2,
  MoreVertical,
  Trash2,
  Upload,
} from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { DeleteMaterialDialog } from '@/components/document/delete-material-dialog';
import { MaterialPreviewDialog } from '@/components/document/material-preview-dialog';
import { MaterialUploadDialog } from '@/components/document/material-upload-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { type MaterialItem, type MaterialStatus, useMaterials } from '@/lib/hooks/use-materials';
import { ACCEPTED_FILE_TYPES_STRING, getFileIconType } from '@/lib/materials/validation';
import { cn } from '@/lib/utils';

export type { MaterialItem, MaterialStatus } from '@/lib/hooks/use-materials';

export type MaterialListProps = {
  projectId: string;
  className?: string;
};

function getStatusBadge(status: MaterialStatus, stage?: string) {
  switch (status) {
    case 'ready':
      return (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0"
          data-testid="material-status-ready"
        >
          <Check className="size-2.5" />
          <span>Ready</span>
        </Badge>
      );
    case 'processing':
      return (
        <Badge
          variant="outline"
          className="gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] px-1.5 py-0 animate-pulse"
          data-testid="material-status-processing"
        >
          <Loader2 className="size-2.5 animate-spin" />
          <span>{stage ? `${stage}` : 'Processing'}</span>
        </Badge>
      );
    case 'failed':
      return (
        <Badge
          variant="destructive"
          className="gap-1 text-[10px] px-1.5 py-0"
          data-testid="material-status-failed"
        >
          <AlertCircle className="size-2.5" />
          <span>Failed</span>
        </Badge>
      );
    default:
      return (
        <Badge
          variant="secondary"
          className="gap-1 text-[10px] px-1.5 py-0 text-muted-foreground"
          data-testid="material-status-pending"
        >
          <Clock className="size-2.5" />
          <span>Pending</span>
        </Badge>
      );
  }
}

export function MaterialList({ projectId, className }: MaterialListProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewMaterialId, setPreviewMaterialId] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteTargetMaterial, setDeleteTargetMaterial] = useState<MaterialItem | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { materials, isLoading, mutate } = useMaterials(projectId);

  const handleInspect = (materialId: string) => {
    setPreviewMaterialId(materialId);
    setPreviewDialogOpen(true);
  };

  const handleDeletePrompt = (material: MaterialItem) => {
    setDeleteTargetMaterial(material);
    setDeleteDialogOpen(true);
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

  const renderItemIcon = (material: MaterialItem) => {
    const iconType = getFileIconType(material.fileType, material.filename);
    switch (iconType) {
      case 'pdf':
        return <FileText className="size-3.5 shrink-0 text-red-500" />;
      case 'image':
        return <FileImage className="size-3.5 shrink-0 text-blue-500" />;
      case 'markdown':
        return <FileCode className="size-3.5 shrink-0 text-emerald-500" />;
      default:
        return <FileText className="size-3.5 shrink-0 text-muted-foreground" />;
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

        {/* Error Notice */}
        {uploadError && (
          <div className="rounded bg-destructive/10 p-1.5 text-[11px] text-destructive">
            {uploadError}
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-1.5 px-1 py-1">
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
                className="group flex items-center justify-between gap-1.5 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors"
                data-testid={`material-item-${material.id}`}
              >
                <button
                  type="button"
                  className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
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
                  {getStatusBadge(material.status, material.metadata?.progress?.stage)}

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
