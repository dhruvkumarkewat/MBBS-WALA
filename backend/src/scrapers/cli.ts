#!/usr/bin/env tsx
/**
 * Scraper CLI — Run scrapers manually from the command line.
 *
 * Usage:
 *   npm run scraper:check       — Check MCC + AACCC for new notices (dry run)
 *   npm run scraper:sync        — Full sync: check, download, extract, import
 *   npm run scraper:dry-run     — Full pipeline but skip DB writes
 */

import { MCCScraper } from './mcc.scraper.js';
import { AACCCScraper } from './aaccc.scraper.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('scraper-cli');

async function main() {
  const command = process.argv[2] || 'check';
  const source = process.argv[3]?.toUpperCase(); // Optional: 'MCC' or 'AACCC'

  log.info({ command, source }, 'Scraper CLI started');

  const scrapers = [];
  if (!source || source === 'MCC') scrapers.push(new MCCScraper());
  if (!source || source === 'AACCC') scrapers.push(new AACCCScraper());

  for (const scraper of scrapers) {
    try {
      switch (command) {
        case 'check': {
          // Just check for updates, don't download or import
          const updates = await (scraper as any).checkForUpdates();
          console.log(`\n═══ ${(scraper as any).bodyCode} Check Results ═══`);
          console.log(`Pages checked: ${updates.pagesChecked}`);
          console.log(`New items found: ${updates.newItems.length}`);
          for (const item of updates.newItems) {
            console.log(`  → [${item.noticeType}] ${item.title}`);
            if (item.fileUrl) console.log(`    File: ${item.fileUrl}`);
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
          console.log('Usage: npm run scraper:check | scraper:sync | scraper:dry-run [MCC|AACCC]');
          process.exit(1);
      }
    } catch (err) {
      log.error({ err, scraper: (scraper as any).bodyCode }, 'Scraper CLI error');
    }
  }

  process.exit(0);
}

main();
