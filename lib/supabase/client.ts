import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { ChatbotError } from '@/lib/errors';

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new ChatbotError('bad_request:auth', 'Missing Supabase environment variables');
  }

  return createBrowserClient(url, anonKey);
}
