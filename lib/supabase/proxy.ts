import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return { supabaseResponse, user: null };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        supabaseResponse = NextResponse.next({
          request,
        });
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // Refreshing the auth token
  let activeUser = null;
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    activeUser = user;
  } catch {
    // Supabase auth service offline or unreachable in local dev
  }

  if (
    !activeUser &&
    (process.env.PLAYWRIGHT_TEST === 'true' || process.env.LOCAL_DEV_AUTH === 'true')
  ) {
    const mockAuth = request.cookies.get('sb-mock-auth');
    if (mockAuth?.value) {
      try {
        const parsed = JSON.parse(mockAuth.value);
        activeUser = {
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          email: parsed.email,
          // biome-ignore lint/style/useNamingConvention: Supabase metadata key
          user_metadata: parsed.user_metadata,
          // biome-ignore lint/style/useNamingConvention: Supabase metadata key
          app_metadata: {},
          aud: 'authenticated',
          // biome-ignore lint/style/useNamingConvention: Supabase metadata key
          created_at: new Date().toISOString(),
        } as unknown as typeof activeUser;
      } catch {
        // ignore
      }
    }
  }

  return { supabaseResponse, user: activeUser };
}
