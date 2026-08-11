#!/usr/bin/env tsx
/**
 * Scraper CLI — Run automated pipeline manually from the command line.
 *
 * Usage:
 *   npm run scraper:check               — Check MCC + AACCC for new notices (dry run)
 *   npm run scraper:check DME_MP        — Check specific State authority (e.g. DME MP)
 *   npm run scraper:sync                — Full sync for central MCC + AACCC
 *   npm run scraper:sync STATES         — Full sync for all Tier-1 State Authorities
 *   npm run scraper:dry-run             — Full pipeline test without database writes
 */

import { MCCScraper } from './mcc.scraper.js';
import { AACCCScraper } from './aaccc.scraper.js';
import { StateScraper } from './state.scraper.js';
import {
  getAllStateAuthorities,
  getStateAuthorityByCode,
  getHighPriorityStateAuthorities,
} from './state-registry.js';
import { getAdminClient } from '../config/database.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('scraper-cli');

async function printStatus() {
  const db = getAdminClient();
  const tables = [
    { name: 'colleges', label: 'Medical Colleges' },
    { name: 'cutoffs', label: 'Counselling Cutoffs' },
    { name: 'seat_matrix', label: 'Seat Matrix Records' },
    { name: 'counselling_notices', label: 'Official Notices' },
    { name: 'notifications', label: 'User Notifications' },
    { name: 'counselling_bodies', label: 'Counselling Authorities' },
    { name: 'counselling_rounds', label: 'Counselling Rounds' },
    { name: 'scraper_runs', label: 'Scraper Run History' },
  ];

  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║        MBBSWALA AUTOMATED PIPELINE & DATABASE STATUS             ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝\n');

  console.log('📊 DATA VOLUMES IN DATABASE:');
  for (const t of tables) {
    try {
      const { count, error } = await db.from(t.name).select('*', { count: 'exact', head: true });
      const statusText = error ? `(Table access restricted)` : `${count?.toLocaleString()} records`;
      console.log(`  • ${t.label.padEnd(25)} : ${statusText}`);
    } catch (e: any) {
      console.log(`  • ${t.label.padEnd(25)} : Check failed`);
    }
  }

  const { data: latestCutoffs } = await db
    .from('cutoffs')
    .select('college_name, state, category, aiq_rank, year, course_name')
    .order('id', { ascending: false })
    .limit(5);

  if (latestCutoffs && latestCutoffs.length > 0) {
    console.log('\n🏆 RECENTLY INGESTED CUTOFFS SAMPLE:');
    console.table(latestCutoffs);
  }

  const { data: latestColleges } = await db
    .from('colleges')
    .select('name, state, college_type, course')
    .order('id', { ascending: false })
    .limit(5);

  if (latestColleges && latestColleges.length > 0) {
    console.log('\n🏥 RECENTLY INGESTED COLLEGES SAMPLE:');
    console.table(latestColleges);
  }

  console.log('\n⚡ PIPELINE AUTOMATION:');
  console.log('  • Central Scraper (MCC, AACCC)     : Active (Auto-polls every 15 min)');
  console.log('  • State Scrapers (36 Authorities)  : Active (Auto-polls every 30 min)');
  console.log('  • Prediction Engine Synchronization : Auto-triggers on new data batch');
  console.log('  • Admin Notification Service        : Active\n');
}

async function main() {
  const command = process.argv[2] || 'status';
  const target = process.argv[3]?.toUpperCase();

  if (command === 'status') {
    await printStatus();
    process.exit(0);
  }

  log.info({ command, target }, 'Automated Medical Counselling Scraper CLI started');

  const scrapers: any[] = [];

  if (!target || target === 'MCC') {
    scrapers.push(new MCCScraper());
  }
  if (!target || target === 'AACCC') {
    scrapers.push(new AACCCScraper());
  }

  if (target === 'STATES' || target === 'ALL_STATES') {
    const states = target === 'ALL_STATES' ? getAllStateAuthorities() : getHighPriorityStateAuthorities();
    for (const auth of states) {
      scrapers.push(new StateScraper(auth));
    }
  } else if (target && target !== 'MCC' && target !== 'AACCC') {
    const stateAuth = getStateAuthorityByCode(target);
    if (stateAuth) {
      scrapers.push(new StateScraper(stateAuth));
    } else {
      console.error(`Unknown authority code: ${target}`);
      console.log('Available state codes: DME_MP, DGME_UP, CET_MAH, KEA_KAR, RUHS_RAJ, ACPUGMEC_GUJ, DME_TN, etc.');
      process.exit(1);
    }
  }

  for (const scraper of scrapers) {
    try {
      const bodyCode = scraper.bodyCode || (scraper as any).config?.code || 'UNKNOWN';

      switch (command) {
        case 'check': {
          const updates = await scraper.checkForUpdates();
          console.log(`\n═══ ${bodyCode} Check Results ═══`);
          console.log(`Pages checked: ${updates.pagesChecked}`);
          console.log(`New items found: ${updates.newItems.length}`);
          for (const item of updates.newItems.slice(0, 10)) {
            console.log(`  → [${item.noticeType}] ${item.title}`);
            if (item.fileUrl) console.log(`    File: ${item.fileUrl}`);
          }
          if (updates.newItems.length > 10) {
            console.log(`  ... and ${updates.newItems.length - 10} more items`);
          }
          break;
        }

        case 'sync': {
          const result = await scraper.run(false);
          console.log(`\n═══ ${result.bodyCode} Sync Results ═══`);
          console.log(`Pages checked: ${result.pagesChecked}`);
          console.log(`New notices: ${result.newNotices}`);
          console.log(`Files downloaded: ${result.filesDownloaded}`);
          console.log(`Records created: ${result.recordsCreated}`);
          console.log(`Records updated: ${result.recordsUpdated}`);
          console.log(`Records skipped: ${result.recordsSkipped}`);
          if (result.errors.length > 0) {
            console.log(`Errors: ${result.errors.length}`);
            for (const e of result.errors) {
              console.log(`  ✗ ${e.item}: ${e.error}`);
            }
          }
          break;
        }

        case 'dry-run': {
          const result = await scraper.run(true);
          console.log(`\n═══ ${result.bodyCode} Dry Run Results ═══`);
          console.log(`Pages checked: ${result.pagesChecked}`);
          console.log(`Would process: ${result.newNotices} notices`);
          console.log('(No database changes made — dry run)');
          break;
        }

        default:
          console.error(`Unknown command: ${command}`);
          console.log('Usage: npm run scraper:check | scraper:sync | scraper:dry-run [MCC|AACCC|STATES|<STATE_CODE>]');
          process.exit(1);
      }
    } catch (err: any) {
      log.error({ err: err.message, scraper: (scraper as any).bodyCode }, 'Scraper CLI error');
    }
  }

  process.exit(0);
}

main();
