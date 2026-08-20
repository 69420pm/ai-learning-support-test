'use client';

import { FileUp, UploadCloud } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type ViewportDropOverlayProps = {
  onFilesDropped: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
};

export function ViewportDropOverlay({
  onFilesDropped,
  className,
  disabled = false,
}: ViewportDropOverlayProps) {
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  useEffect(() => {
    if (disabled) return;

    const handleWindowDragEnter = (e: DragEvent) => {
      e.preventDefault();
      // Only trigger if dragged item contains files
      if (e.dataTransfer?.types?.includes('Files')) {
        dragCounter.current += 1;
        if (dragCounter.current === 1) {
          setIsDraggingOver(true);
        }
      }
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = Math.max(0, dragCounter.current - 1);
      if (dragCounter.current === 0) {
        setIsDraggingOver(false);
      }
    };

    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      dragCounter.current = 0;
      setIsDraggingOver(false);

      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        onFilesDropped(files);
      }
    };

    window.addEventListener('dragenter', handleWindowDragEnter);
    window.addEventListener('dragleave', handleWindowDragLeave);
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);

    return () => {
      window.removeEventListener('dragenter', handleWindowDragEnter);
      window.removeEventListener('dragleave', handleWindowDragLeave);
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, [disabled, onFilesDropped]);

  if (!isDraggingOver || disabled) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/85 backdrop-blur-sm p-8 transition-all',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
        className,
      )}
      data-testid="viewport-drop-overlay"
    >
      <div className="relative flex flex-col items-center justify-center max-w-md rounded-2xl border-2 border-dashed border-primary bg-card/90 p-10 text-center shadow-2xl animate-pulse">
        <div className="flex size-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-4 ring-8 ring-primary/5">
          <UploadCloud className="size-10 text-primary animate-bounce" />
        </div>
        <h3 className="font-semibold text-lg text-foreground tracking-tight">
          Drop learning materials here
        </h3>
        <p className="mt-1 text-xs text-muted-foreground max-w-xs">
          Release files to stage and upload them to this project. PDF, Markdown, Text, and Images
          are supported.
        </p>
        <div className="mt-4 flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[11px] font-medium text-foreground">
          <FileUp className="size-3.5 text-primary" />
          <span>Full Viewport Dropzone Active</span>
        </div>
      </div>
    </div>
  );
}
