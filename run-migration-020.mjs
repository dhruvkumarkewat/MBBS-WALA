/**
 * Run migration 020 against Supabase using the REST API exec_sql RPC.
 * Usage: node run-migration-020.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://hbzzamezfhzsdupdhcin.supabase.co';
// Needs service role key — falls back to anon key (DDL may fail without service role)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_5D517PLNdF92v3Q1s6Dp_w_WaZtsrPo';

const migrationPath = join(__dirname, 'supabase', 'migrations', '020_fix_sync_triggers_and_duplicates.sql');
const sql = readFileSync(migrationPath, 'utf-8');

console.log(`\n🔄 Applying migration 020_fix_sync_triggers_and_duplicates.sql`);
console.log(`📍 Target: ${SUPABASE_URL}\n`);

// Try using pg_execute RPC or exec_sql RPC
async function tryExecSql(query) {
  // Method 1: exec_sql RPC
  let res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ query }),
  });
  if (res.ok) return { ok: true };
  const err1 = await res.json().catch(() => ({ message: res.statusText }));

  // Method 2: pg_execute RPC
  res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/pg_execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
    body: JSON.stringify({ sql: query }),
  });
  if (res.ok) return { ok: true };
  const err2 = await res.json().catch(() => ({ message: res.statusText }));

  return { ok: false, error: err1.message || err2.message || 'Unknown error' };
}

const result = await tryExecSql(sql);
if (result.ok) {
  console.log('✅ Migration 020 applied successfully!');
} else {
  console.error('❌ Could not apply via RPC:', result.error);
  console.log('\n📋 Please run this SQL manually in the Supabase SQL Editor:');
  console.log('   https://supabase.com/dashboard/project/hbzzamezfhzsdupdhcin/sql/new\n');
  console.log('--- COPY BELOW ---');
  console.log(sql);
  console.log('--- END ---');
}
