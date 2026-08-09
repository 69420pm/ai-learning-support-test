'use client';

import { AlertCircle, Loader2, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePassword } from '@/lib/auth/actions';
import { resetPasswordSchema } from '@/lib/auth/validation';

export function ResetPasswordForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const parseResult = resetPasswordSchema.safeParse({
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
      const res = await updatePassword({
        password,
        confirmPassword,
      });

      if (res.success) {
        router.push('/login?message=password-updated');
        router.refresh();
      } else {
        setServerError(res.error || 'Failed to update password. Please try again.');
      }
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h2 className="font-semibold text-xl tracking-tight">Set new password</h2>
        <p className="text-muted-foreground text-sm">Please enter your new password below.</p>
      </div>

      {serverError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2" data-invalid={Boolean(errors.password) || undefined}>
          <Label htmlFor="password">New Password</Label>
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
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
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
              Updating password...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>
    </div>
  );
}
