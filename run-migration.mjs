/**
 * Run migration 013_ai_predictor_schema.sql against the configured Supabase project.
 * Uses the Supabase REST /rest/v1/rpc pattern via the Management API via fetch.
 * 
 * Usage: node run-migration.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://hbzzamezfhzsdupdhcin.supabase.co';
// For DDL, we need the service role. If not available, we'll try with the anon key
// and report what happened.
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_5D517PLNdF92v3Q1s6Dp_w_WaZtsrPo';

const migrationPath = join(__dirname, 'supabase', 'migrations', '013_ai_predictor_schema.sql');
const sql = readFileSync(migrationPath, 'utf-8');

// Split SQL into individual statements (split on semicolons, skip empty)
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 5 && !s.startsWith('--'));

console.log(`\n🔄 Running migration 013_ai_predictor_schema.sql`);
console.log(`📍 Target: ${SUPABASE_URL}`);
console.log(`📝 Statements to execute: ${statements.length}\n`);

let passed = 0;
let skipped = 0;
let failed = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i] + ';';
  const preview = stmt.slice(0, 80).replace(/\n/g, ' ');
  
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({ query: stmt }),
    });

    if (res.ok) {
      console.log(`  ✅ [${i+1}/${statements.length}] ${preview}`);
      passed++;
    } else {
      const err = await res.json().catch(() => ({ message: res.statusText }));
      // "already exists" type errors are OK
      const msg = err.message || err.hint || JSON.stringify(err);
      if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('42P07') || msg.includes('42710')) {
        console.log(`  ⏭️  [${i+1}/${statements.length}] Already exists (skipped): ${preview}`);
        skipped++;
      } else {
        console.error(`  ❌ [${i+1}/${statements.length}] FAILED: ${msg}`);
        console.error(`     SQL: ${preview}`);
        failed++;
      }
    }
  } catch (e) {
    console.error(`  ❌ [${i+1}/${statements.length}] Network error: ${e.message}`);
    failed++;
  }
}

console.log(`\n📊 Migration result: ${passed} applied, ${skipped} skipped (already exist), ${failed} failed`);

if (failed > 0) {
  console.log('\n⚠️  Some statements failed. This may be because:');
  console.log('   1. The anon key cannot run DDL — you need the Service Role key.');
  console.log('   2. Use the Supabase dashboard SQL Editor to run the migration directly.');
  console.log(`   3. File path: ${migrationPath}`);
  process.exit(1);
} else {
  console.log('\n✅ Migration 013 complete!');
}
