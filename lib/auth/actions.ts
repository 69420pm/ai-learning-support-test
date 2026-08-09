'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  type ForgotPasswordInput,
  forgotPasswordSchema,
  type LoginInput,
  loginSchema,
  type ResetPasswordInput,
  resetPasswordSchema,
  type SignUpInput,
  signUpSchema,
} from '@/lib/auth/validation';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema/profiles';
import { createClient } from '@/lib/supabase/server';

export type AuthActionResult = {
  success: boolean;
  error?: string;
};

export async function signIn(input: LoginInput): Promise<AuthActionResult> {
  const parseResult = loginSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || 'Invalid input' };
  }

  const { email, password } = parseResult.data;
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Authentication service unavailable';
    return { success: false, error: msg };
  }
}

export async function signUp(input: SignUpInput): Promise<AuthActionResult> {
  const parseResult = signUpSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || 'Invalid input' };
  }

  const { email, password, fullName } = parseResult.data;
  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          // biome-ignore lint/style/useNamingConvention: Supabase metadata key
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.user) {
      try {
        await db
          .insert(profiles)
          .values({
            id: data.user.id,
            email: data.user.email ?? email,
            fullName: fullName,
          })
          .onConflictDoNothing();
      } catch (dbError) {
        console.error('Failed to create user profile in Drizzle:', dbError);
      }
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Authentication service unavailable';
    return { success: false, error: msg };
  }
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('Failed to sign out from Supabase:', err);
  }
  revalidatePath('/', 'layout');
  redirect('/login');
}

export async function requestPasswordReset(input: ForgotPasswordInput): Promise<AuthActionResult> {
  const parseResult = forgotPasswordSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || 'Invalid input' };
  }

  const { email } = parseResult.data;
  try {
    const supabase = await createClient();

    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const redirectTo = `${origin}/auth/callback?redirectTo=/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Authentication service unavailable';
    return { success: false, error: msg };
  }
}

export async function updatePassword(input: ResetPasswordInput): Promise<AuthActionResult> {
  const parseResult = resetPasswordSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || 'Invalid input' };
  }

  const { password } = parseResult.data;
  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Authentication service unavailable';
    return { success: false, error: msg };
  }
}
