import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser } from '@/lib/auth/session';

const mockGetUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

const mockCookieGet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: mockCookieGet,
  })),
}));

describe('getCurrentUser', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it('returns authenticated user from Supabase when available', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          // biome-ignore lint/style/useNamingConvention: Supabase metadata property names
          user_metadata: {
            // biome-ignore lint/style/useNamingConvention: Supabase metadata property names
            full_name: 'Test User',
            // biome-ignore lint/style/useNamingConvention: Supabase metadata property names
            avatar_url: 'https://example.com/avatar.png',
          },
        },
      },
      error: null,
    });

    const user = await getCurrentUser();
    expect(user).toEqual({
      id: 'user-123',
      email: 'user@example.com',
      fullName: 'Test User',
      avatarUrl: 'https://example.com/avatar.png',
    });
  });

  it('falls back to mock auth cookie when PLAYWRIGHT_TEST is true and no supabase user', async () => {
    process.env.PLAYWRIGHT_TEST = 'true';
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    mockCookieGet.mockReturnValueOnce({
      value: JSON.stringify({
        email: 'e2e@example.com',
        // biome-ignore lint/style/useNamingConvention: Supabase metadata property names
        user_metadata: {
          // biome-ignore lint/style/useNamingConvention: Supabase metadata property names
          full_name: 'E2E User',
        },
      }),
    });

    const user = await getCurrentUser();
    expect(user).toEqual({
      id: 'mock-user-id',
      email: 'e2e@example.com',
      fullName: 'E2E User',
      avatarUrl: undefined,
    });
  });

  it('returns null when no user session exists', async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: null },
      error: null,
    });

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });
});
