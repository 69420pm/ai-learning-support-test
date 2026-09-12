'use client';

import { AlertTriangle, Home, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export type ErrorBoundaryProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RouteError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error('[RouteError Boundary Caught]:', error);
  }, [error]);

  const displayMessage =
    error.message?.trim() || 'An unexpected error occurred while loading this page.';

  return (
    <div
      role="alert"
      className="flex min-h-[60vh] w-full flex-col items-center justify-center p-6 text-center"
    >
      <div className="w-full max-w-md rounded-xl border border-destructive/20 bg-card p-6 shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </div>

        <h2 className="text-xl font-semibold tracking-tight text-foreground">
          Something went wrong
        </h2>

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
            data-testid="error-retry-button"
            className="flex items-center gap-2"
          >
            <RotateCcw className="size-4" />
            Try again
          </Button>

          <Button
            asChild
            variant="outline"
            data-testid="error-home-link"
            className="flex items-center gap-2"
          >
            <Link href="/projects">
              <Home className="size-4" />
              Return to Projects
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
