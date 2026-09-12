'use client';

import { AlertTriangle, ArrowLeft, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export type ProjectErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProjectWorkspaceError({ error, reset }: ProjectErrorProps) {
  useEffect(() => {
    console.error('[ProjectWorkspaceError Boundary Caught]:', error);
  }, [error]);

  const displayMessage = error.message?.trim() || 'Unable to load this project workspace.';

  return (
    <div
      role="alert"
      className="flex h-full min-h-[50vh] w-full flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-full max-w-md rounded-xl border border-destructive/20 bg-card p-6 shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>

        <h2 className="text-xl font-semibold tracking-tight text-foreground">Workspace Error</h2>

        <p className="mt-2 text-sm text-muted-foreground">{displayMessage}</p>

        {error.digest && (
          <p className="mt-3 rounded bg-muted/60 px-2.5 py-1 font-mono text-xs text-muted-foreground">
            Error ID: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button
            type="button"
            variant="default"
            onClick={() => reset()}
            data-testid="project-error-retry"
            className="flex items-center gap-2"
          >
            <RotateCcw className="size-4" />
            Retry Workspace
          </Button>

          <Button
            asChild
            variant="outline"
            data-testid="project-error-back-link"
            className="flex items-center gap-2"
          >
            <Link href="/projects">
              <ArrowLeft className="size-4" />
              Back to Projects
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
