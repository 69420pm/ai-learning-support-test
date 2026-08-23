import { beforeEach, describe, expect, it, vi } from 'vitest';
import { themeSchema, updateThemePreference, updateThemeSchema } from '@/app/actions/theme';
import * as authSession from '@/lib/auth/session';
import * as profileQueries from '@/lib/db/queries/profile';

// Mock auth session
vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: vi.fn(),
  requireAuthUser: vi.fn(),
  // biome-ignore lint/style/useNamingConvention: Mock export names
  CANONICAL_LOCAL_USER: {
    id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    email: 'local@learner.ai',
    fullName: 'Local Learner',
  },
  // biome-ignore lint/style/useNamingConvention: Mock export names
  CANONICAL_LOCAL_USER_ID: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
}));

// Mock Profile queries
vi.mock('@/lib/db/queries/profile', () => ({
  updateProfileTheme: vi.fn(),
  getProfileByUserId: vi.fn(),
}));

describe('Theme Validation Schemas', () => {
  it('validates single theme enum values correctly', () => {
    expect(themeSchema.safeParse('system').success).toBe(true);
    expect(themeSchema.safeParse('light').success).toBe(true);
    expect(themeSchema.safeParse('dark').success).toBe(true);

    expect(themeSchema.safeParse('neon').success).toBe(false);
    expect(themeSchema.safeParse('').success).toBe(false);
    expect(themeSchema.safeParse(null).success).toBe(false);
    expect(themeSchema.safeParse(undefined).success).toBe(false);
  });

  it('validates updateThemeSchema for object input shape', () => {
    expect(updateThemeSchema.safeParse({ theme: 'dark' })).toEqual({
      success: true,
      data: { theme: 'dark' },
    });
    expect(updateThemeSchema.safeParse({ theme: 'light' })).toEqual({
      success: true,
      data: { theme: 'light' },
    });
    expect(updateThemeSchema.safeParse({ theme: 'system' })).toEqual({
      success: true,
      data: { theme: 'system' },
    });

    expect(updateThemeSchema.safeParse({ theme: 'custom' }).success).toBe(false);
    expect(updateThemeSchema.safeParse({ theme: '' }).success).toBe(false);
    expect(updateThemeSchema.safeParse({}).success).toBe(false);
    expect(updateThemeSchema.safeParse(123).success).toBe(false);
  });
});

describe('Theme Server Action (updateThemePreference)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid theme input with validation error', async () => {
    const result = await updateThemePreference('invalid-theme');
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(profileQueries.updateProfileTheme).not.toHaveBeenCalled();
  });

  it('fails gracefully for unauthenticated guest without throwing', async () => {
    vi.mocked(authSession.getCurrentUser).mockResolvedValueOnce(null);

    const result = await updateThemePreference('dark');
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unauthorized|not authenticated/i);
    expect(profileQueries.updateProfileTheme).not.toHaveBeenCalled();
  });

  it('persists theme preference for authenticated user via profile query service', async () => {
    const mockUser = {
      id: 'mock-user-uuid',
      email: 'learner@example.com',
      fullName: 'Learner One',
    };
    vi.mocked(authSession.getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(profileQueries.updateProfileTheme).mockResolvedValueOnce({
      id: mockUser.id,
      email: mockUser.email,
      fullName: mockUser.fullName,
      avatarUrl: null,
      theme: 'dark',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await updateThemePreference('dark');
    expect(result.success).toBe(true);
    expect(result.theme).toBe('dark');
    expect(profileQueries.updateProfileTheme).toHaveBeenCalledWith({
      userId: 'mock-user-uuid',
      theme: 'dark',
    });
  });

  it('accepts object input shape { theme: "light" } for authenticated user', async () => {
    const mockUser = {
      id: 'mock-user-uuid',
      email: 'learner@example.com',
    };
    vi.mocked(authSession.getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(profileQueries.updateProfileTheme).mockResolvedValueOnce({
      id: mockUser.id,
      email: mockUser.email,
      fullName: null,
      avatarUrl: null,
      theme: 'light',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await updateThemePreference({ theme: 'light' });
    expect(result.success).toBe(true);
    expect(result.theme).toBe('light');
    expect(profileQueries.updateProfileTheme).toHaveBeenCalledWith({
      userId: 'mock-user-uuid',
      theme: 'light',
    });
  });

  it('handles database errors gracefully and returns error result', async () => {
    const mockUser = {
      id: 'mock-user-uuid',
      email: 'learner@example.com',
    };
    vi.mocked(authSession.getCurrentUser).mockResolvedValueOnce(mockUser);
    vi.mocked(profileQueries.updateProfileTheme).mockRejectedValueOnce(
      new Error('Connection terminated unexpectedly'),
    );

    const result = await updateThemePreference('system');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Connection terminated unexpectedly');
  });
});
