'use client';

import {
  AlertCircle,
  CheckCircle2,
  FileCode,
  FileImage,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSWRConfig } from 'swr';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ACCEPTED_FILE_TYPES_STRING,
  formatFileSize,
  getFileIconType,
  validateMaterialFile,
} from '@/lib/materials/validation';
import { cn } from '@/lib/utils';

export type StagedFile = {
  id: string;
  file: File;
  name: string;
  size: number;
  valid: boolean;
  error?: string;
  status: 'queued' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
};

export type MaterialUploadDialogProps = {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFiles?: File[];
  onUploadSuccess?: () => void;
};

export function MaterialUploadDialog({
  projectId,
  open,
  onOpenChange,
  initialFiles = [],
  onUploadSuccess,
}: MaterialUploadDialogProps) {
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutate } = useSWRConfig();

  const addFiles = useCallback((files: File[]) => {
    if (!files.length) return;

    const newEntries: StagedFile[] = files.map((file) => {
      const validation = validateMaterialFile(file);
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        valid: validation.valid,
        error: validation.error,
        status: validation.valid ? 'queued' : 'error',
        errorMessage: validation.error,
      };
    });

    setStagedFiles((prev) => [...prev, ...newEntries]);
  }, []);

  // When initialFiles change on open
  useEffect(() => {
    if (open && initialFiles && initialFiles.length > 0) {
      addFiles(initialFiles);
    }
  }, [open, initialFiles, addFiles]);

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setStagedFiles([]);
      setIsUploading(false);
      setIsDragOver(false);
    }
  }, [open]);

  const handleRemoveFile = (id: string) => {
    if (isUploading) return;
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      addFiles(files);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    if (files.length > 0) {
      addFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const uploadSingleFile = async (staged: StagedFile): Promise<boolean> => {
    const formData = new FormData();
    formData.append('file', staged.file);
    formData.append('title', staged.name.replace(/\.[^/.]+$/, ''));

    setStagedFiles((prev) =>
      prev.map((f) => (f.id === staged.id ? { ...f, status: 'uploading' } : f)),
    );

    try {
      const response = await fetch(`/api/projects/${projectId}/materials`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Upload failed');
      }

      setStagedFiles((prev) =>
        prev.map((f) => (f.id === staged.id ? { ...f, status: 'success' } : f)),
      );
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      setStagedFiles((prev) =>
        prev.map((f) => (f.id === staged.id ? { ...f, status: 'error', errorMessage: msg } : f)),
      );
      return false;
    }
  };

  const handleStartUpload = async () => {
    const validQueued = stagedFiles.filter(
      (f) => f.valid && (f.status === 'queued' || f.status === 'error'),
    );
    if (validQueued.length === 0) return;

    setIsUploading(true);

    try {
      await Promise.all(validQueued.map((staged) => uploadSingleFile(staged)));

      await mutate(`/api/projects/${projectId}/materials`);
      onUploadSuccess?.();

      setStagedFiles((current) => {
        const hasErrors = current.some((f) => f.status === 'error');
        if (!hasErrors) {
          setTimeout(() => onOpenChange(false), 800);
        }
        return current;
      });
    } finally {
      setIsUploading(false);
    }
  };

  const validFilesToUpload = stagedFiles.filter(
    (f) => f.valid && (f.status === 'queued' || f.status === 'error'),
  );
  const totalUploaded = stagedFiles.filter((f) => f.status === 'success').length;
  const hasErrors = stagedFiles.some((f) => f.status === 'error');

  const renderFileIcon = (file: File) => {
    const iconType = getFileIconType(file.type, file.name);
    switch (iconType) {
      case 'pdf':
        return <FileText className="size-5 text-red-500 shrink-0" />;
      case 'image':
        return <FileImage className="size-5 text-blue-500 shrink-0" />;
      case 'markdown':
        return <FileCode className="size-5 text-emerald-500 shrink-0" />;
      default:
        return <FileText className="size-5 text-muted-foreground shrink-0" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={isUploading ? undefined : onOpenChange}>
      <DialogContent className="max-w-lg gap-4" data-testid="material-upload-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UploadCloud className="size-5 text-primary" />
            <span>Upload Learning Materials</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Add PDF lecture notes, Markdown summaries, plain text, or slide images. Files will be
            parsed and indexed into vector chunks for grounded learning.
          </DialogDescription>
        </DialogHeader>

        {/* Drop Zone */}
        <button
          type="button"
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors cursor-pointer w-full',
            isDragOver
              ? 'border-primary bg-primary/5 text-primary'
              : 'border-border/80 hover:border-primary/50 hover:bg-muted/30',
          )}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          data-testid="upload-drop-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILE_TYPES_STRING}
            className="hidden"
            onChange={handleFileInputChange}
            data-testid="upload-dialog-file-input"
          />
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <UploadCloud className="size-5 text-muted-foreground" />
          </div>
          <div className="flex flex-col gap-0.5">
            <p className="font-medium text-xs text-foreground">
              Click to browse or drag & drop files here
            </p>
            <p className="text-[11px] text-muted-foreground">
              PDF, Markdown, Text, or Images (Max 25MB each)
            </p>
          </div>
        </button>

        {/* Staged Files List */}
        {stagedFiles.length > 0 && (
          <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Selected Files ({stagedFiles.length})
                {totalUploaded > 0 && ` • ${totalUploaded} uploaded`}
              </span>
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={() => setStagedFiles([])}
                >
                  Clear all
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              {stagedFiles.map((staged, idx) => (
                <div
                  key={staged.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-md border p-2 text-xs transition-colors',
                    staged.status === 'error'
                      ? 'border-destructive/40 bg-destructive/5'
                      : staged.status === 'success'
                        ? 'border-emerald-500/30 bg-emerald-500/5'
                        : 'border-border bg-card',
                  )}
                  data-testid={`staged-file-item-${idx}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {renderFileIcon(staged.file)}
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <span className="truncate font-medium text-foreground text-[11px]">
                        {staged.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span>{formatFileSize(staged.size)}</span>
                        {staged.errorMessage && (
                          <span className="text-destructive font-medium truncate">
                            • {staged.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator / Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {staged.status === 'uploading' && (
                      <Loader2 className="size-4 animate-spin text-primary" />
                    )}
                    {staged.status === 'success' && (
                      <Badge
                        variant="outline"
                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1 text-[10px] px-1.5 py-0"
                      >
                        <CheckCircle2 className="size-3" />
                        <span>Ready</span>
                      </Badge>
                    )}
                    {staged.status === 'error' && (
                      <Badge variant="destructive" className="gap-1 text-[10px] px-1.5 py-0">
                        <AlertCircle className="size-3" />
                        <span>Error</span>
                      </Badge>
                    )}
                    {staged.status === 'queued' && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        Queued
                      </Badge>
                    )}

                    {!isUploading && staged.status !== 'success' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-6 text-muted-foreground hover:text-destructive"
                        onClick={() => handleRemoveFile(staged.id)}
                        aria-label={`Remove ${staged.name}`}
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="flex-row items-center justify-between sm:justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
            data-testid="cancel-upload-button"
          >
            {totalUploaded > 0 && !hasErrors ? 'Done' : 'Cancel'}
          </Button>

          <Button
            variant="default"
            size="sm"
            className="gap-1.5"
            onClick={handleStartUpload}
            disabled={isUploading || validFilesToUpload.length === 0}
            data-testid="start-upload-button"
          >
            {isUploading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud className="size-3.5" />
                <span>
                  Upload {validFilesToUpload.length > 0 ? `(${validFilesToUpload.length})` : ''}
                </span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
