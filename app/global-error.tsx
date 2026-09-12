'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[GlobalError Boundary Caught]:', error);
  }, [error]);

  const displayMessage =
    error.message?.trim() || 'A critical layout error interrupted the application.';

  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <div
          role="alert"
          className="flex min-h-screen w-full flex-col items-center justify-center p-6 text-center"
        >
          <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-8 shadow-md">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertTriangle className="size-7" />
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Critical Application Error
            </h1>

            <p className="mt-3 text-sm text-muted-foreground">{displayMessage}</p>

            {error.digest && (
              <p className="mt-3 rounded bg-muted/60 px-2.5 py-1 font-mono text-xs text-muted-foreground">
                Digest: {error.digest}
              </p>
            )}

            <div className="mt-6 flex justify-center">
              <Button
                type="button"
                variant="default"
                onClick={() => reset()}
                data-testid="global-error-retry"
                className="flex items-center gap-2"
              >
                <RotateCcw className="size-4" />
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
