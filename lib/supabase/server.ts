import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware / proxy refreshing user sessions.
        }
      },
    },
  });

  if (process.env.PLAYWRIGHT_TEST === 'true' || process.env.LOCAL_DEV_AUTH === 'true') {
    const mockAuth = cookieStore.get('sb-mock-auth');
    if (mockAuth?.value) {
      const origGetUser = supabase.auth.getUser.bind(supabase.auth);
      supabase.auth.getUser = (async (jwt?: string) => {
        const res = await origGetUser(jwt).catch(
          () =>
            ({ data: { user: null }, error: null }) as unknown as Awaited<
              ReturnType<typeof origGetUser>
            >,
        );
        if (res?.data?.user) return res;
        try {
          const rawVal = mockAuth.value;
          const decoded = rawVal.includes('%') ? decodeURIComponent(rawVal) : rawVal;
          const parsed = JSON.parse(decoded);
          const mockUser = {
            id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
            email: parsed.email || 'test@example.com',
            // biome-ignore lint/style/useNamingConvention: Supabase metadata key
            user_metadata: parsed.user_metadata || { full_name: 'Test User' },
            // biome-ignore lint/style/useNamingConvention: Supabase metadata key
            app_metadata: {},
            aud: 'authenticated',
            // biome-ignore lint/style/useNamingConvention: Supabase metadata key
            created_at: new Date().toISOString(),
          };
          return { data: { user: mockUser as unknown as typeof res.data.user }, error: null };
        } catch {
          return res;
        }
      }) as typeof origGetUser;
    }
  }

  return supabase;
}
