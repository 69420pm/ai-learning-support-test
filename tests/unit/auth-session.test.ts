import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CANONICAL_LOCAL_USER,
  CANONICAL_LOCAL_USER_ID,
  getCurrentUser,
  requireAuthUser,
} from '@/lib/auth/session';
import { ChatbotError } from '@/lib/errors';

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

describe('auth session module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.LOCAL_MODE;
    delete process.env.PLAYWRIGHT_TEST;
    delete process.env.LOCAL_DEV_AUTH;
  });

  describe('CANONICAL_LOCAL_USER constants', () => {
    it('defines canonical local user ID as a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', () => {
      expect(CANONICAL_LOCAL_USER_ID).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(CANONICAL_LOCAL_USER.id).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(CANONICAL_LOCAL_USER.email).toBeDefined();
    });
  });

  describe('getCurrentUser', () => {
    describe('Cloud Supabase Mode', () => {
      it('returns authenticated user from Supabase when session exists', async () => {
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

      it('returns null when Supabase returns no user', async () => {
        mockGetUser.mockResolvedValueOnce({
          data: { user: null },
          error: null,
        });

        const user = await getCurrentUser();
        expect(user).toBeNull();
      });

      it('returns null gracefully when Supabase client throws an error in cloud mode', async () => {
        mockGetUser.mockRejectedValueOnce(new Error('Network error'));

        const user = await getCurrentUser();
        expect(user).toBeNull();
      });
    });

    describe('Local Privacy Mode (LOCAL_MODE=true)', () => {
      it('resolves canonical local user even without session cookie or Supabase call', async () => {
        process.env.LOCAL_MODE = 'true';

        const user = await getCurrentUser();
        expect(user).toEqual({
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          email: 'local@learner.ai',
          fullName: 'Local Learner',
        });
        expect(mockGetUser).not.toHaveBeenCalled();
        expect(mockCookieGet).not.toHaveBeenCalled();
      });
    });

    describe('Dev / Test Mode', () => {
      it('parses sb-mock-auth cookie and defaults to canonical UUID when id is omitted (PLAYWRIGHT_TEST=true)', async () => {
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
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          email: 'e2e@example.com',
          fullName: 'E2E User',
          avatarUrl: undefined,
        });
      });

      it('preserves explicit id from sb-mock-auth cookie when provided', async () => {
        process.env.LOCAL_DEV_AUTH = 'true';
        mockGetUser.mockResolvedValueOnce({
          data: { user: null },
          error: null,
        });

        mockCookieGet.mockReturnValueOnce({
          value: JSON.stringify({
            id: 'custom-dev-id',
            email: 'dev@example.com',
            fullName: 'Dev User',
            avatarUrl: 'https://example.com/dev.png',
          }),
        });

        const user = await getCurrentUser();
        expect(user).toEqual({
          id: 'custom-dev-id',
          email: 'dev@example.com',
          fullName: 'Dev User',
          avatarUrl: 'https://example.com/dev.png',
        });
      });

      it('handles URL-encoded sb-mock-auth cookie value', async () => {
        process.env.PLAYWRIGHT_TEST = 'true';
        mockGetUser.mockResolvedValueOnce({
          data: { user: null },
          error: null,
        });

        const rawJson = JSON.stringify({
          email: 'encoded@example.com',
          // biome-ignore lint/style/useNamingConvention: Supabase metadata property names
          user_metadata: { full_name: 'Encoded User' },
        });

        mockCookieGet.mockReturnValueOnce({
          value: encodeURIComponent(rawJson),
        });

        const user = await getCurrentUser();
        expect(user).toEqual({
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          email: 'encoded@example.com',
          fullName: 'Encoded User',
          avatarUrl: undefined,
        });
      });

      it('returns null when sb-mock-auth cookie contains invalid JSON', async () => {
        process.env.PLAYWRIGHT_TEST = 'true';
        mockGetUser.mockResolvedValueOnce({
          data: { user: null },
          error: null,
        });

        mockCookieGet.mockReturnValueOnce({
          value: 'invalid-json-string',
        });

        const user = await getCurrentUser();
        expect(user).toBeNull();
      });

      it('returns null when sb-mock-auth cookie is missing in dev/test mode', async () => {
        process.env.PLAYWRIGHT_TEST = 'true';
        mockGetUser.mockResolvedValueOnce({
          data: { user: null },
          error: null,
        });

        mockCookieGet.mockReturnValueOnce(undefined);

        const user = await getCurrentUser();
        expect(user).toBeNull();
      });
    });
  });

  describe('requireAuthUser', () => {
    it('returns verified AuthUser when session is valid', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: {
          user: {
            id: 'valid-user-123',
            email: 'valid@example.com',
            // biome-ignore lint/style/useNamingConvention: Supabase metadata property names
            user_metadata: {
              // biome-ignore lint/style/useNamingConvention: Supabase metadata property names
              full_name: 'Valid User',
            },
          },
        },
        error: null,
      });

      const user = await requireAuthUser();
      expect(user).toEqual({
        id: 'valid-user-123',
        email: 'valid@example.com',
        fullName: 'Valid User',
        avatarUrl: undefined,
      });
    });

    it('returns verified AuthUser in Local Privacy Mode', async () => {
      process.env.LOCAL_MODE = 'true';

      const user = await requireAuthUser();
      expect(user).toEqual({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        email: 'local@learner.ai',
        fullName: 'Local Learner',
      });
    });

    it('throws ChatbotError with unauthorized:chat by default when user is null', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      await expect(requireAuthUser()).rejects.toThrow(ChatbotError);

      try {
        mockGetUser.mockResolvedValueOnce({
          data: { user: null },
          error: null,
        });
        await requireAuthUser();
      } catch (err) {
        expect(err).toBeInstanceOf(ChatbotError);
        const chatbotErr = err as ChatbotError;
        expect(chatbotErr.statusCode).toBe(401);
        expect(chatbotErr.type).toBe('unauthorized');
        expect(chatbotErr.surface).toBe('chat');
        const response = chatbotErr.toResponse();
        expect(response.status).toBe(401);
      }
    });

    it('throws ChatbotError with custom surface when provided', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      try {
        await requireAuthUser('api');
      } catch (err) {
        expect(err).toBeInstanceOf(ChatbotError);
        const chatbotErr = err as ChatbotError;
        expect(chatbotErr.statusCode).toBe(401);
        expect(chatbotErr.type).toBe('unauthorized');
        expect(chatbotErr.surface).toBe('api');
      }
    });
  });
});
