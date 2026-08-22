import { cookies } from 'next/headers';
import { z } from 'zod';
import { ChatbotError, type Surface } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

export type AuthUser = {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
};

export const CANONICAL_LOCAL_USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

export const CANONICAL_LOCAL_USER: AuthUser = {
  id: CANONICAL_LOCAL_USER_ID,
  email: 'local@learner.ai',
  fullName: 'Local Learner',
};

const mockAuthCookieSchema = z.object({
  id: z.string().optional(),
  email: z.string().optional().default(''),
  // biome-ignore lint/style/useNamingConvention: Supabase metadata property name
  user_metadata: z
    .object({
      // biome-ignore lint/style/useNamingConvention: Supabase metadata property name
      full_name: z.string().optional(),
      // biome-ignore lint/style/useNamingConvention: Supabase metadata property name
      avatar_url: z.string().optional(),
    })
    .optional(),
  fullName: z.string().optional(),
  avatarUrl: z.string().optional(),
});

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
    const rawVal = mockAuth.value;
    const decoded = rawVal.includes('%') ? decodeURIComponent(rawVal) : rawVal;
    const parsed = mockAuthCookieSchema.safeParse(JSON.parse(decoded));
    if (!parsed.success) {
      return null;
    }

    const { id, email, user_metadata, fullName, avatarUrl } = parsed.data;
    return {
      id: id ?? CANONICAL_LOCAL_USER_ID,
      email,
      fullName: user_metadata?.full_name ?? fullName,
      avatarUrl: user_metadata?.avatar_url ?? avatarUrl,
    };
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (process.env.LOCAL_MODE === 'true') {
    return CANONICAL_LOCAL_USER;
  }

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
  } catch (error) {
    if (process.env.PLAYWRIGHT_TEST !== 'true' && process.env.LOCAL_DEV_AUTH !== 'true') {
      console.error('Failed to fetch user session from Supabase:', error);
    }
  }

  return await getMockDevUser();
}

export async function requireAuthUser(surface: Surface = 'chat'): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ChatbotError(`unauthorized:${surface}`);
  }
  return user;
}
