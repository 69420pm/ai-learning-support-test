'use client';

import { AlertCircle, CheckCircle2, Loader2, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signIn } from '@/lib/auth/actions';
import { loginSchema } from '@/lib/auth/validation';

type LoginFormProps = {
  redirectTo?: string;
  initialMessage?: string;
};

export function LoginForm({ redirectTo, initialMessage }: LoginFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const parseResult = loginSchema.safeParse({ email, password });
    if (!parseResult.success) {
      const fieldErrors: { email?: string; password?: string } = {};
      for (const issue of parseResult.error.issues) {
        if (issue.path[0] === 'email') fieldErrors.email = issue.message;
        if (issue.path[0] === 'password') fieldErrors.password = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const res = await signIn({ email, password });
      if (res.success) {
        const destination = redirectTo || '/dashboard';
        router.push(destination);
        router.refresh();
      } else {
        setServerError(res.error || 'Failed to sign in. Please check your credentials.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h2 className="font-semibold text-xl tracking-tight">Sign in to your account</h2>
        <p className="text-muted-foreground text-sm">Enter your email and password below</p>
      </div>

      {initialMessage && (
        <Alert variant="success">
          <CheckCircle2 className="size-4" />
          <AlertDescription>{initialMessage}</AlertDescription>
        </Alert>
      )}

      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2" data-invalid={Boolean(errors.email) || undefined}>
          <Label htmlFor="email">Email</Label>
          <div className="relative flex items-center">
            <Mail className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={Boolean(errors.email)}
              className="pl-9"
              disabled={isPending}
            />
          </div>
          {errors.email && <p className="font-medium text-destructive text-xs">{errors.email}</p>}
        </div>

        <div className="flex flex-col gap-2" data-invalid={Boolean(errors.password) || undefined}>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="font-medium text-primary text-xs hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative flex items-center">
            <Lock className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={Boolean(errors.password)}
              className="pl-9"
              disabled={isPending}
            />
          </div>
          {errors.password && (
            <p className="font-medium text-destructive text-xs">{errors.password}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </Button>
      </form>

      <div className="text-center text-muted-foreground text-sm">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Sign up
        </Link>
      </div>
    </div>
  );
}
