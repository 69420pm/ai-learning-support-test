import {
  createBrowserClient as ssrCreateBrowserClient,
  createServerClient as ssrCreateServerClient,
} from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient as createBrowserClient } from './client';
import { createClient as createServerClient } from './server';

type CookieToSet = {
  name: string;
  value: string;
  options?: Record<string, unknown>;
};

type CookieAdapter = {
  getAll: () => Array<{ name: string; value: string }>;
  setAll: (cookies: CookieToSet[]) => void;
};

type MockServerClient = SupabaseClient & {
  _options?: {
    cookies?: CookieAdapter;
  };
  _originalGetUser: ReturnType<typeof vi.fn>;
};

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: vi.fn((url: string, anonKey: string) => ({
    url,
    anonKey,
    auth: { getUser: vi.fn() },
  })),
  createServerClient: vi.fn(
    (url: string, anonKey: string, options: { cookies?: CookieAdapter }) => {
      const originalGetUser = vi.fn().mockResolvedValue({
        data: { user: null },
        error: new Error('Auth session missing'),
      });
      return {
        url,
        anonKey,
        auth: { getUser: originalGetUser },
        _options: options,
        _originalGetUser: originalGetUser,
      } as unknown as SupabaseClient;
    },
  ),
}));

describe('Supabase Client Factories', () => {
  const originalEnv = process.env;
  const mockCookieGet = vi.fn();
  const mockCookieGetAll = vi.fn();
  const mockCookieSet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-123';

    mockCookieGet.mockReset();
    mockCookieGetAll.mockReset().mockReturnValue([]);
    mockCookieSet.mockReset();

    vi.mocked(cookies).mockResolvedValue({
      get: mockCookieGet,
      getAll: mockCookieGetAll,
      set: mockCookieSet,
    } as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('createBrowserClient', () => {
    it('throws error when env vars are missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      expect(() => createBrowserClient()).toThrow('Missing Supabase environment variables');
    });

    it('instantiates browser client when env vars are present', () => {
      const client = createBrowserClient();
      expect(client).toBeDefined();
      expect(ssrCreateBrowserClient).toHaveBeenCalledWith(
        'https://example.supabase.co',
        'anon-key-123',
      );
    });
  });

  describe('createServerClient', () => {
    it('throws error when env vars are missing', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      await expect(createServerClient()).rejects.toThrow('Missing Supabase environment variables');
    });

    it('instantiates server client when env vars are present', async () => {
      const client = await createServerClient();
      expect(client).toBeDefined();
      expect(ssrCreateServerClient).toHaveBeenCalledWith(
        'https://example.supabase.co',
        'anon-key-123',
        expect.objectContaining({
          cookies: expect.any(Object),
        }),
      );
    });

    it('passes pure cookie adapter getAll to cookieStore.getAll', async () => {
      mockCookieGetAll.mockReturnValueOnce([{ name: 'sb-token', value: 'xyz' }]);

      const client = (await createServerClient()) as unknown as MockServerClient;
      const cookieAdapter = client._options?.cookies;
      expect(cookieAdapter?.getAll).toBeDefined();

      const result = cookieAdapter?.getAll();
      expect(result).toEqual([{ name: 'sb-token', value: 'xyz' }]);
      expect(mockCookieGetAll).toHaveBeenCalledTimes(1);
    });

    it('passes pure cookie adapter setAll to cookieStore.set', async () => {
      const client = (await createServerClient()) as unknown as MockServerClient;
      const cookieAdapter = client._options?.cookies;
      expect(cookieAdapter?.setAll).toBeDefined();

      cookieAdapter?.setAll([
        { name: 'cookie1', value: 'val1', options: { path: '/' } },
        { name: 'cookie2', value: 'val2', options: { httpOnly: true } },
      ]);

      expect(mockCookieSet).toHaveBeenCalledTimes(2);
      expect(mockCookieSet).toHaveBeenNthCalledWith(1, 'cookie1', 'val1', { path: '/' });
      expect(mockCookieSet).toHaveBeenNthCalledWith(2, 'cookie2', 'val2', { httpOnly: true });
    });

    it('ignores errors thrown in setAll when executed from a Server Component context', async () => {
      mockCookieSet.mockImplementation(() => {
        throw new Error('Cookies can only be modified in a Server Action or Route Handler.');
      });

      const client = (await createServerClient()) as unknown as MockServerClient;
      const cookieAdapter = client._options?.cookies;

      expect(() => {
        cookieAdapter?.setAll([{ name: 'c', value: 'v', options: {} }]);
      }).not.toThrow();
    });

    it.each([
      ['PLAYWRIGHT_TEST', 'e2e@example.com'],
      ['LOCAL_DEV_AUTH', 'dev@example.com'],
    ])(
      'does not mutate or monkeypatch supabase.auth.getUser when %s is true and sb-mock-auth cookie is present',
      async (envVar, email) => {
        process.env[envVar] = 'true';

        mockCookieGet.mockReturnValue({
          name: 'sb-mock-auth',
          value: JSON.stringify({ email }),
        });

        const client = (await createServerClient()) as unknown as MockServerClient;

        // The getUser method must remain the unmutated original reference from @supabase/ssr
        expect(client.auth.getUser).toBe(client._originalGetUser);

        // Calling getUser should execute the standard supabase client method without monkeypatched interception
        const res = await client.auth.getUser();
        expect(res.data.user).toBeNull();
        expect(res.error).toBeDefined();
      },
    );
  });
});
