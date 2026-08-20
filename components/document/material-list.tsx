'use client';

import { AlertCircle, Check, Clock, FileText, Loader2, Upload } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import useSWR from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Material, MaterialStatus } from '@/lib/db/schema';
import { cn, fetcher } from '@/lib/utils';

export type MaterialListProps = {
  projectId: string;
  className?: string;
};

type MaterialsResponse = {
  materials: Material[];
};

function getStatusBadge(status: MaterialStatus) {
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
          <span>Processing</span>
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
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const materialsKey = projectId ? `/api/projects/${projectId}/materials` : null;

  const { data, mutate, isLoading } = useSWR<MaterialsResponse>(materialsKey, fetcher, {
    // Poll while materials are in pending/processing status
    refreshInterval: (latestData) => {
      const hasActiveIngestion = latestData?.materials?.some(
        (m) => m.status === 'pending' || m.status === 'processing',
      );
      return hasActiveIngestion ? 2000 : 0;
    },
    revalidateOnFocus: true,
  });

  const materials = data?.materials || [];

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
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
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
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
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          className="hidden"
          onChange={handleFileChange}
          data-testid="material-file-input"
        />

        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-1.5 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          data-testid="upload-material-button"
        >
          {isUploading ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Upload className="size-3" />
          )}
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

      {/* Materials List */}
      {!isLoading && materials.length === 0 && (
        <div
          className="rounded border border-dashed border-border/60 p-2 text-center text-[11px] text-muted-foreground"
          data-testid="empty-materials-list"
        >
          No materials uploaded yet.
        </div>
      )}

      {!isLoading && materials.length > 0 && (
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
          {materials.map((material) => (
            <div
              key={material.id}
              className="group flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/50 transition-colors"
              data-testid={`material-item-${material.id}`}
            >
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <FileText className="size-3.5 shrink-0 text-muted-foreground" />
                <span
                  className="truncate font-medium text-foreground text-[11px]"
                  title={material.title}
                >
                  {material.title}
                </span>
              </div>
              <div className="shrink-0">{getStatusBadge(material.status as MaterialStatus)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
