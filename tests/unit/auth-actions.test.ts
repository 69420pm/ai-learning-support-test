import { beforeEach, describe, expect, it, vi } from 'vitest';
import { requestPasswordReset, signIn, signUp, updatePassword } from '@/lib/auth/actions';
import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signUpSchema,
} from '@/lib/auth/validation';

// Mock Supabase server client
const mockSignInWithPassword = vi.fn();
const mockSignUp = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signUp: mockSignUp,
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
    },
  })),
}));

// Mock Drizzle DB
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        onConflictDoNothing: vi.fn().mockResolvedValue({}),
      })),
    })),
  },
}));

// Mock Next.js cache and navigation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

describe('Auth Validation Schemas', () => {
  it('validates login schema correctly', () => {
    const valid = loginSchema.safeParse({ email: 'user@example.com', password: 'password123' });
    expect(valid.success).toBe(true);

    const invalidEmail = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' });
    expect(invalidEmail.success).toBe(false);

    const shortPassword = loginSchema.safeParse({ email: 'user@example.com', password: '123' });
    expect(shortPassword.success).toBe(false);
  });

  it('validates signup schema and checks password matching', () => {
    const valid = signUpSchema.safeParse({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(valid.success).toBe(true);

    const mismatch = signUpSchema.safeParse({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'password123',
      confirmPassword: 'different123',
    });
    expect(mismatch.success).toBe(false);
  });

  it('validates forgot password schema', () => {
    const valid = forgotPasswordSchema.safeParse({ email: 'user@example.com' });
    expect(valid.success).toBe(true);

    const invalid = forgotPasswordSchema.safeParse({ email: 'invalid-email' });
    expect(invalid.success).toBe(false);
  });

  it('validates reset password schema', () => {
    const valid = resetPasswordSchema.safeParse({
      password: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    expect(valid.success).toBe(true);

    const mismatch = resetPasswordSchema.safeParse({
      password: 'newpassword123',
      confirmPassword: 'differentpassword',
    });
    expect(mismatch.success).toBe(false);
  });
});

describe('Auth Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns error on invalid signIn input', async () => {
    const result = await signIn({ email: 'invalid', password: '123' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('calls supabase signInWithPassword on valid input', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: null });

    const result = await signIn({ email: 'test@example.com', password: 'password123' });
    expect(result.success).toBe(true);
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
    });
  });

  it('returns error when signIn fails in Supabase', async () => {
    mockSignInWithPassword.mockResolvedValueOnce({ error: { message: 'Invalid credentials' } });

    const result = await signIn({ email: 'test@example.com', password: 'password123' });
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid credentials');
  });

  it('creates profile record on successful signUp', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: 'user-uuid-123', email: 'new@example.com' } },
      error: null,
    });

    const result = await signUp({
      fullName: 'Alex Smith',
      email: 'new@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(result.success).toBe(true);
    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      options: {
        data: {
          // biome-ignore lint/style/useNamingConvention: Supabase metadata key
          full_name: 'Alex Smith',
        },
      },
    });
  });

  it('returns error when signUp fails in Supabase', async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'User already exists' },
    });

    const result = await signUp({
      fullName: 'Alex Smith',
      email: 'existing@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('User already exists');
  });

  it('calls resetPasswordForEmail on valid requestPasswordReset', async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ error: null });

    const result = await requestPasswordReset({ email: 'user@example.com' });
    expect(result.success).toBe(true);
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'user@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/callback?redirectTo=/reset-password'),
      }),
    );
  });

  it('calls updateUser on valid updatePassword', async () => {
    mockUpdateUser.mockResolvedValueOnce({ error: null });

    const result = await updatePassword({
      password: 'newpassword123',
      confirmPassword: 'newpassword123',
    });
    expect(result.success).toBe(true);
    expect(mockUpdateUser).toHaveBeenCalledWith({
      password: 'newpassword123',
    });
  });
});
