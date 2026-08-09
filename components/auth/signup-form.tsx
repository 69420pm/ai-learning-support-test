'use client';

import { AlertCircle, CheckCircle2, Loader2, Lock, Mail, User } from 'lucide-react';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { signUp } from '@/lib/auth/actions';
import { signUpSchema } from '@/lib/auth/validation';

export function SignupForm() {
  const [isPending, startTransition] = useTransition();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const parseResult = signUpSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
    });

    if (!parseResult.success) {
      const fieldErrors: typeof errors = {};
      for (const issue of parseResult.error.issues) {
        const field = issue.path[0] as keyof typeof errors;
        if (field) fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    startTransition(async () => {
      const res = await signUp({
        fullName,
        email,
        password,
        confirmPassword,
      });

      if (res.success) {
        setIsSuccess(true);
      } else {
        setServerError(res.error || 'Failed to sign up. Please try again.');
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
          We&apos;ve sent a verification link to{' '}
          <span className="font-medium text-foreground">{email}</span>. Please check your inbox and
          follow the instructions to confirm your account.
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
        <h2 className="font-semibold text-xl tracking-tight">Create an account</h2>
        <p className="text-muted-foreground text-sm">Enter your details to register</p>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2" data-invalid={Boolean(errors.fullName) || undefined}>
          <Label htmlFor="fullName">Full Name</Label>
          <div className="relative flex items-center">
            <User className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <Input
              id="fullName"
              type="text"
              placeholder="Jane Doe"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-invalid={Boolean(errors.fullName)}
              className="pl-9"
              disabled={isPending}
            />
          </div>
          {errors.fullName && (
            <p className="font-medium text-destructive text-xs">{errors.fullName}</p>
          )}
        </div>

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
          <Label htmlFor="password">Password</Label>
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

        <div
          className="flex flex-col gap-2"
          data-invalid={Boolean(errors.confirmPassword) || undefined}
        >
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative flex items-center">
            <Lock className="pointer-events-none absolute left-3 size-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={Boolean(errors.confirmPassword)}
              className="pl-9"
              disabled={isPending}
            />
          </div>
          {errors.confirmPassword && (
            <p className="font-medium text-destructive text-xs">{errors.confirmPassword}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" data-icon="inline-start" />
              Creating account...
            </>
          ) : (
            'Create Account'
          )}
        </Button>
      </form>

      <div className="text-center text-muted-foreground text-sm">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </div>
    </div>
  );
}
