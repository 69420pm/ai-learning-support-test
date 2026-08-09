import type React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
      <div className="z-10 flex w-full max-w-md flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground text-xl shadow-lg">
            AI
          </div>
          <h1 className="font-bold text-2xl tracking-tight">AI Learning Support</h1>
          <p className="text-muted-foreground text-sm">Document-Grounded Active Learning System</p>
        </div>
        <div className="w-full rounded-2xl border bg-card/90 p-6 shadow-xl backdrop-blur-sm sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
