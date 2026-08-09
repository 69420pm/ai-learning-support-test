import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient as createBrowserClient } from './client';
import { createClient as createServerClient } from './server';

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

describe('Supabase Client Factories', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('throws error when env vars are missing in browser client', () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    expect(() => createBrowserClient()).toThrow('Missing Supabase environment variables');
  });

  it('instantiates browser client when env vars are present', () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-123';
    const client = createBrowserClient();
    expect(client).toBeDefined();
  });

  it('throws error when env vars are missing in server client', async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    await expect(createServerClient()).rejects.toThrow('Missing Supabase environment variables');
  });

  it('instantiates server client when env vars are present', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key-123';
    const client = await createServerClient();
    expect(client).toBeDefined();
  });
});
