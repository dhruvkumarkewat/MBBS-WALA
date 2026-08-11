import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { env } from './env.js';

// Polyfill global WebSocket for Node.js runtimes without native WebSocket (< v22)
if (typeof globalThis.WebSocket === 'undefined') {
  class SafeWebSocket {
    static readonly CONNECTING = 0;
    static readonly OPEN = 1;
    static readonly CLOSING = 2;
    static readonly CLOSED = 3;
    readonly CONNECTING = 0;
    readonly OPEN = 1;
    readonly CLOSING = 2;
    readonly CLOSED = 3;
    readyState = 3;
    onopen = null;
    onclose = null;
    onerror = null;
    onmessage = null;
    send() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() { return true; }
  }
  // @ts-ignore
  globalThis.WebSocket = SafeWebSocket;
}

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
