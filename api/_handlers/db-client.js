import { createClient } from '@supabase/supabase-js';
import { triggerRestore } from './db-wake.js';

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  '';

if (!supabaseUrl) {
  console.error('[db-client] SUPABASE_URL env var is not set. Database operations will fail.');
}

// For database operations: prefer service role key (bypasses RLS), fall back to anon key
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SERVICE_ROLE_KEY ||
  null;

const rawAnonKey =
  process.env.SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

const supabaseAnonKey =
  rawAnonKey && rawAnonKey !== 'dummy_key' && !rawAnonKey.includes('dummy')
    ? rawAnonKey
    : '';

const supabaseKey = supabaseServiceKey || supabaseAnonKey;

export function assertServiceRole() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for this operation but is not configured in the environment.');
  }
}

// Note: startup log removed to avoid leaking environment details

const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      fetch: async (url, options) => {
        const res = await fetch(url, options);
        if (!res.ok && res.status >= 500) triggerRestore();
        return res;
      },
    },
  }
);

export default supabase;
