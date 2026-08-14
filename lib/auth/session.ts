import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export type AuthUser = {
  id?: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
};

async function getMockDevUser(): Promise<AuthUser | null> {
  if (process.env.PLAYWRIGHT_TEST !== 'true' && process.env.LOCAL_DEV_AUTH !== 'true') {
    return null;
  }

  const cookieStore = await cookies();
  const mockAuth = cookieStore.get('sb-mock-auth');
  if (!mockAuth?.value) {
    return null;
  }

  try {
    const parsed = JSON.parse(mockAuth.value);
    return {
      id: parsed.id ?? 'mock-user-id',
      email: parsed.email ?? '',
      fullName: (parsed.user_metadata?.full_name as string | undefined) ?? undefined,
      avatarUrl: (parsed.user_metadata?.avatar_url as string | undefined) ?? undefined,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return {
        id: user.id,
        email: user.email ?? '',
        fullName: (user.user_metadata?.full_name as string | undefined) ?? undefined,
        avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? undefined,
      };
    }

    return await getMockDevUser();
  } catch (error) {
    console.error('Failed to fetch user session:', error);
    return null;
  }
}
