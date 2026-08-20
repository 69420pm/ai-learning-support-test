'use client';

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSWRConfig } from 'swr';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { MaterialItem } from '@/lib/hooks/use-materials';

export type DeleteMaterialDialogProps = {
  projectId: string;
  material: MaterialItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function DeleteMaterialDialog({
  projectId,
  material,
  open,
  onOpenChange,
  onSuccess,
}: DeleteMaterialDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  if (!material) return null;

  const chunkCount = material.metadata?.chunkCount;

  const handleDelete = async () => {
    setIsDeleting(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/materials/${material.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Failed to delete material');
      }

      await mutate(`/api/projects/${projectId}/materials`);
      onSuccess?.();
      onOpenChange(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Deletion failed');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={isDeleting ? undefined : onOpenChange}>
      <DialogContent className="max-w-md gap-4" data-testid="delete-material-dialog">
        <DialogHeader className="gap-2">
          <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-1">
            <AlertTriangle className="size-5" />
          </div>
          <DialogTitle className="text-base font-semibold">Delete Material</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">"{material.title}"</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive flex flex-col gap-1.5">
          <p className="font-medium">Permanent Cascade Deletion Notice:</p>
          <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-muted-foreground">
            <li>Deletes material database record and metadata</li>
            <li>
              Purges{' '}
              {chunkCount === undefined
                ? 'all indexed vector chunks'
                : `${chunkCount} indexed vector chunks`}{' '}
              and cosine embeddings
            </li>
            <li>
              Removes the underlying physical storage blob (
              <span className="font-mono">{material.filename}</span>)
            </li>
          </ul>
        </div>

        {errorMessage && (
          <div className="rounded bg-destructive/10 p-2 text-xs text-destructive">
            {errorMessage}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            data-testid="cancel-delete-material-button"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="gap-1.5"
            onClick={handleDelete}
            disabled={isDeleting}
            data-testid="confirm-delete-material-button"
          >
            {isDeleting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="size-3.5" />
                <span>Delete Material</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
