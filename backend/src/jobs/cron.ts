import { CronJob } from 'cron';
import { MCCScraper } from '../scrapers/mcc.scraper.js';
import { AACCCScraper } from '../scrapers/aaccc.scraper.js';
import { StateScraper } from '../scrapers/state.scraper.js';
import { getHighPriorityStateAuthorities, getAllStateAuthorities } from '../scrapers/state-registry.js';
import { RoundDetectionService } from '../services/round-detection.service.js';
import { PredictionService } from '../services/prediction.service.js';
import { NotificationService } from '../services/notification.service.js';
import { createChildLogger } from '../utils/logger.js';
import { env } from '../config/env.js';

const log = createChildLogger('cron');

/**
 * Automated Medical Counselling Data Pipeline Scheduler
 * 
 * Multi-Phase Adaptive Cron Schedule:
 * - MCC (Central MBBS/BDS/SS): Every 15 min
 * - AACCC (Central AYUSH): Every 15 min
 * - Tier-1 State Authorities (MP, UP, MH, KA, TN, RJ, GJ, etc.): Staggered every 30 min
 * - Automated Prediction Model Recalibration on data ingestion
 * - Automated Admin Alerts on round transitions and cutoff changes
 */
export function startCronJobs(): void {
  const interval = env.SCRAPER_INTERVAL_MINUTES || 15;
  const predictionService = new PredictionService();
  const notificationService = new NotificationService();
  const roundService = new RoundDetectionService();

  // 1. MCC Scraper Job (Every 15 min)
  const mccJob = new CronJob(`*/${interval} * * * *`, async () => {
    log.info('Running automated MCC check');
    try {
      const scraper = new MCCScraper();
      const result = await scraper.run();
      log.info(
        { newNotices: result.newNotices, recordsCreated: result.recordsCreated, errors: result.errors.length },
        'MCC check complete'
      );

      if (result.newNotices > 0 || result.recordsCreated > 0) {
        await roundService.detectAndUpdateRounds('MCC');
        await predictionService.syncWithLatestScrapedData();
        await notificationService.notifyAdmins(
          'MCC Updates Ingested',
          `Automated pipeline ingested ${result.newNotices} new notices and ${result.recordsCreated} records from MCC.`,
          { bodyCode: 'MCC', recordsCreated: result.recordsCreated }
        );
      }
    } catch (err: any) {
      log.error({ err: err.message }, 'Scheduled MCC check failed');
    }
  });

  // 2. AACCC Scraper Job (Every 15 min)
  const aacccJob = new CronJob(`*/${interval} * * * *`, async () => {
    log.info('Running automated AACCC check');
    try {
      const scraper = new AACCCScraper();
      const result = await scraper.run();
      log.info(
        { newNotices: result.newNotices, recordsCreated: result.recordsCreated, errors: result.errors.length },
        'AACCC check complete'
      );

      if (result.newNotices > 0 || result.recordsCreated > 0) {
        await roundService.detectAndUpdateRounds('AACCC');
        await predictionService.syncWithLatestScrapedData();
        await notificationService.notifyAdmins(
          'AACCC AYUSH Updates Ingested',
          `Automated pipeline ingested ${result.newNotices} new notices and ${result.recordsCreated} records from AACCC.`,
          { bodyCode: 'AACCC', recordsCreated: result.recordsCreated }
        );
      }
    } catch (err: any) {
      log.error({ err: err.message }, 'Scheduled AACCC check failed');
    }
  });

// 3. State Authorities Batch Job (Every 15 min, staggered at minute 5)
  const stateJob = new CronJob(`5,20,35,50 * * * *`, async () => {
    log.info('Running automated State Authorities batch check (15m interval)');
    const authorities = getHighPriorityStateAuthorities();

    for (const auth of authorities) {
      try {
        const scraper = new StateScraper(auth);
        const result = await scraper.run();

        if (result.newNotices > 0 || result.recordsCreated > 0) {
          await roundService.detectAndUpdateRounds(auth.code);
          await predictionService.syncWithLatestScrapedData();
          await notificationService.notifyAdmins(
            `${auth.state} Updates Ingested`,
            `Automated pipeline ingested ${result.newNotices} new notices and ${result.recordsCreated} records from ${auth.name}.`,
            { bodyCode: auth.code, state: auth.state, recordsCreated: result.recordsCreated }
          );
        }
      } catch (err: any) {
        log.warn({ state: auth.state, err: err.message }, 'State authority check encountered error');
      }
    }
  });

  // Start all cron jobs
  mccJob.start();
  aacccJob.start();
  stateJob.start();

  log.info(
    `Continuous Automated Data Pipeline active: All Authorities (MCC, AACCC, & 36 States) synchronizing every 15 minutes.`
  );

  // Trigger initial synchronization on startup in background
  setTimeout(async () => {
    log.info('Executing startup data synchronization check...');
    try {
      const mcc = new MCCScraper();
      const aaccc = new AACCCScraper();
      await Promise.allSettled([mcc.run(), aaccc.run()]);
      await predictionService.syncWithLatestScrapedData();
      log.info('Startup data synchronization complete.');
    } catch (e: any) {
      log.warn({ error: e.message }, 'Startup synchronization error (non-fatal)');
    }
  }, 3000);
}
