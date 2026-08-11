/**
 * Run migration 016_college_comparisons.sql against Supabase.
 * Usage: node run-migration-016.mjs
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://hbzzamezfhzsdupdhcin.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_publishable_5D517PLNdF92v3Q1s6Dp_w_WaZtsrPo';

const migrationPath = join(__dirname, 'supabase', 'migrations', '016_college_comparisons.sql');
const sql = readFileSync(migrationPath, 'utf-8');

const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 5 && !s.startsWith('--'));

console.log(`\n🔄 Running migration 016_college_comparisons.sql`);
console.log(`📍 Target: ${SUPABASE_URL}`);
console.log(`📝 Statements to execute: ${statements.length}\n`);

let passed = 0, skipped = 0, failed = 0;

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
      const msg = err.message || err.hint || JSON.stringify(err);
      if (msg.includes('already exists') || msg.includes('duplicate') || msg.includes('42P07') || msg.includes('42710')) {
        console.log(`  ⏭️  [${i+1}/${statements.length}] Already exists: ${preview}`);
        skipped++;
      } else {
        console.error(`  ❌ [${i+1}/${statements.length}] FAILED: ${msg}`);
        failed++;
      }
    }
  } catch (e) {
    console.error(`  ❌ [${i+1}/${statements.length}] Network error: ${e.message}`);
    failed++;
  }
}

console.log(`\n📊 Result: ${passed} applied, ${skipped} skipped, ${failed} failed`);
if (failed > 0) {
  console.log('\n⚠️  Run the SQL manually in Supabase Dashboard → SQL Editor:');
  console.log(`   ${migrationPath}`);
}
