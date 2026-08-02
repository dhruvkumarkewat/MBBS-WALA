import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

let adminClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

/**
 * Supabase admin client — uses service role key.
 * Bypasses RLS. Use for scraper writes, admin operations, and background jobs.
 */
export function getAdminClient(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

/**
 * Supabase public client — uses anon key.
 * Respects RLS. Use for public-facing reads.
 */
export function getPublicClient(): SupabaseClient {
  if (!publicClient) {
    publicClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return publicClient;
}

export { SupabaseClient };
