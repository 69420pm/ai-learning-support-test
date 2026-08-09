'use client';

import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { requestPasswordReset } from '@/lib/auth/actions';
import { forgotPasswordSchema } from '@/lib/auth/validation';

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setServerError(null);

    const parseResult = forgotPasswordSchema.safeParse({ email });
    if (!parseResult.success) {
      setError(parseResult.error.issues[0]?.message || 'Invalid email address');
      return;
    }

    startTransition(async () => {
      const res = await requestPasswordReset({ email });
      if (res.success) {
        setIsSuccess(true);
      } else {
        setServerError(res.error || 'Failed to send reset link. Please try again.');
      }
    });
  };

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
          <CheckCircle2 className="size-10 text-emerald-500" />
        </div>
        <h2 className="font-semibold text-xl tracking-tight">Check your email</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          We&apos;ve sent a password reset link to{' '}
          <span className="font-medium text-foreground">{email}</span>. Click the link in the email
          to set a new password.
        </p>
        <Button asChild className="mt-2 w-full" variant="outline">
          <Link href="/login">Return to Sign In</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h2 className="font-semibold text-xl tracking-tight">Forgot your password?</h2>
        <p className="text-muted-foreground text-sm">
          Enter your email address and we&apos;ll send you a link to reset your password.
        </p>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2" data-invalid={Boolean(error) || undefined}>
          <Label htmlFor="email">Email</Label>
          <div className="relative flex items-center">
            <Mail className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(error)}
              className="pl-9"
              disabled={isPending}
            />
          </div>
          {error && <p className="font-medium text-destructive text-xs">{error}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              Sending reset link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>

      <div className="text-center">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 font-medium text-muted-foreground text-sm hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
