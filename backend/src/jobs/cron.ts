import { CronJob } from 'cron';
import { MCCScraper } from '../scrapers/mcc.scraper.js';
import { AACCCScraper } from '../scrapers/aaccc.scraper.js';
import { RoundDetectionService } from '../services/round-detection.service.js';
import { createChildLogger } from '../utils/logger.js';
import { env } from '../config/env.js';

const log = createChildLogger('cron');

/**
 * Start all scheduled jobs.
 * - MCC check every 15 minutes
 * - AACCC check every 15 minutes
 * - Round detection every 15 minutes
 */
export function startCronJobs(): void {
  const interval = env.SCRAPER_INTERVAL_MINUTES;

  // MCC Scraper — check every N minutes
  const mccJob = new CronJob(`*/${interval} * * * *`, async () => {
    log.info('Running scheduled MCC check');
    try {
      const scraper = new MCCScraper();
      const result = await scraper.run();
      log.info({ result: { newNotices: result.newNotices, errors: result.errors.length } }, 'MCC check complete');

      // If new notices found, trigger round detection
      if (result.newNotices > 0) {
        const roundService = new RoundDetectionService();
        await roundService.detectAndUpdateRounds('MCC');
      }
    } catch (err) {
      log.error({ err }, 'Scheduled MCC check failed');
    }
  });

  // AACCC Scraper — check every N minutes
  const aacccJob = new CronJob(`*/${interval} * * * *`, async () => {
    log.info('Running scheduled AACCC check');
    try {
      const scraper = new AACCCScraper();
      const result = await scraper.run();
      log.info({ result: { newNotices: result.newNotices, errors: result.errors.length } }, 'AACCC check complete');

      if (result.newNotices > 0) {
        const roundService = new RoundDetectionService();
        await roundService.detectAndUpdateRounds('AACCC');
      }
    } catch (err) {
      log.error({ err }, 'Scheduled AACCC check failed');
    }
  });

  // Start all jobs
  mccJob.start();
  aacccJob.start();

  log.info(`Cron jobs started. Checking MCC and AACCC every ${interval} minutes.`);
}
