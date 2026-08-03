import { Router, Request, Response, NextFunction } from 'express';
import { getAdminClient } from '../../config/database.js';
import { createChildLogger } from '../../utils/logger.js';

const log = createChildLogger('admin');
export const adminRoutes = Router();

// TODO: Add JWT authentication middleware for admin routes
// For now, these are protected only by the service role key in Supabase

/**
 * GET /api/v1/admin/scraper/status
 * Get current scraper status and recent runs.
 */
adminRoutes.get('/scraper/status', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getAdminClient();

    // Get recent scraper jobs
    const { data: jobs } = await db
      .from('scraper_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    // Get recent runs
    const { data: runs } = await db
      .from('scraper_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    res.json({
      jobs: jobs || [],
      recent_runs: runs || [],
      message: jobs?.length ? undefined : 'No scraper jobs found. Tables may not be created yet.',
    });
  } catch (err) {
    log.warn({ err }, 'Scraper status query failed — tables may not exist yet');
    res.json({
      jobs: [],
      recent_runs: [],
      message: 'Scraper tables not yet created. Run database migrations first.',
    });
  }
});

/**
 * GET /api/v1/admin/scraper/authorities
 * List all supported Central & State Medical Counselling Authorities.
 */
adminRoutes.get('/scraper/authorities', async (_req: Request, res: Response) => {
  const { getAllStateAuthorities } = await import('../../scrapers/state-registry.js');
  const states = getAllStateAuthorities();
  res.json({
    central: [
      { code: 'MCC', name: 'Medical Counselling Committee (MCC)', baseUrl: 'https://mcc.nic.in', courses: ['MBBS', 'BDS', 'SS'] },
      { code: 'AACCC', name: 'Ayush Admissions Central Counseling Committee (AACCC)', baseUrl: 'https://aaccc.gov.in', courses: ['BAMS', 'BHMS', 'BUMS', 'BSMS'] }
    ],
    states,
    total: 2 + states.length,
  });
});

/**
 * GET & POST /api/v1/admin/scraper/run-now
 * Execute live scraping on the Render cloud server without hitting HTTP timeouts.
 */
adminRoutes.all('/scraper/run-now', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const target = String(req.query.target || req.body?.target || 'ALL').toUpperCase();
    const isDryRun = req.query.dry_run === 'true' || req.body?.dry_run === true;
    const shouldWait = req.query.wait === 'true' || req.body?.wait === true;

    log.info({ target, isDryRun, shouldWait }, 'Online live scraping requested via API');

    const executeScraping = async () => {
      const results: any[] = [];
      const { MCCScraper } = await import('../../scrapers/mcc.scraper.js');
      const { AACCCScraper } = await import('../../scrapers/aaccc.scraper.js');
      const { StateScraper } = await import('../../scrapers/state.scraper.js');
      const { getHighPriorityStateAuthorities } = await import('../../scrapers/state-registry.js');

      if (target === 'ALL' || target === 'MCC') {
        const mcc = new MCCScraper();
        const resMcc = await mcc.run(isDryRun);
        results.push({ authority: 'MCC', ...resMcc });
      }

      if (target === 'ALL' || target === 'AACCC') {
        const aaccc = new AACCCScraper();
        const resAaccc = await aaccc.run(isDryRun);
        results.push({ authority: 'AACCC', ...resAaccc });
      }

      if (target === 'ALL' || target === 'STATES') {
        const states = getHighPriorityStateAuthorities();
        for (const st of states.slice(0, 5)) {
          try {
            const sc = new StateScraper(st);
            const resSt = await sc.run(isDryRun);
            results.push({ authority: st.code, state: st.state, ...resSt });
          } catch (e: any) {
            results.push({ authority: st.code, state: st.state, error: e.message });
          }
        }
      }

      return results;
    };

    if (shouldWait) {
      const results = await executeScraping();
      return res.json({
        status: 'completed',
        target,
        timestamp: new Date().toISOString(),
        summary: {
          totalAuthoritiesChecked: results.length,
          totalNewNotices: results.reduce((a, b) => a + (b.newNotices || 0), 0),
          totalRecordsCreated: results.reduce((a, b) => a + (b.recordsCreated || 0), 0),
          totalRecordsUpdated: results.reduce((a, b) => a + (b.recordsUpdated || 0), 0),
        },
        results,
      });
    }

    // Default: Respond immediately so Render proxy doesn't time out (502)
    // Run execution in the background
    executeScraping()
      .then((resArr) => {
        log.info(
          { target, authoritiesProcessed: resArr.length },
          'Background cloud scraping execution completed'
        );
      })
      .catch((err) => {
        log.error({ target, err: err.message }, 'Background cloud scraping execution failed');
      });

    return res.status(200).json({
      status: 'initiated',
      message: `🚀 Scraping for [${target}] successfully launched in the background on Render.`,
      target,
      isDryRun,
      track_status_url: '/api/v1/admin/scraper/status',
      hint: 'Check /api/v1/admin/scraper/status or your Render Logs tab to see live PDF parsing and Supabase records.',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    log.error({ err }, 'Failed to initiate online live scraping');
    next(err);
  }
});

/**
 * POST /api/v1/admin/scraper/trigger
 * Manually queue a scraper job.
 */
adminRoutes.post('/scraper/trigger', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { body_code = 'MCC', job_type = 'notice_check' } = req.body;
    const db = getAdminClient();

    const { data, error } = await db
      .from('scraper_jobs')
      .insert({
        body_code,
        job_type,
        status: 'pending',
        priority: 10, // High priority for manual triggers
      })
      .select()
      .single();

    if (error) throw error;

    log.info({ body_code, job_type }, 'Manual scraper job triggered');
    res.json({ job: data, message: 'Scraper job queued successfully.' });
  } catch (err) {
    log.error({ err }, 'Failed to trigger scraper');
    next(err);
  }
});

/**
 * GET /api/v1/admin/stats
 * Dashboard overview statistics.
 */
adminRoutes.get('/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getAdminClient();

    // Safe count helper — returns 0 if table doesn't exist
    const safeCount = async (table: string) => {
      try {
        const { count, error } = await db.from(table).select('*', { count: 'exact', head: true });
        return error ? 0 : (count || 0);
      } catch { return 0; }
    };

    const [collegeCount, cutoffCount, userCount, predictionCount] = await Promise.all([
      safeCount('colleges'),
      safeCount('cutoffs'),
      safeCount('student_profiles'),
      safeCount('prediction_logs'),
    ]);

    res.json({
      colleges: collegeCount,
      cutoffs: cutoffCount,
      users: userCount,
      predictions: predictionCount,
      last_updated: new Date().toISOString(),
    });
  } catch (err) {
    log.error({ err }, 'Failed to fetch admin stats');
    next(err);
  }
});

/**
 * GET /api/v1/admin/audit
 * Get recent audit log entries.
 */
adminRoutes.get('/audit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getAdminClient();
    const { limit: limitStr = '50' } = req.query as Record<string, string>;
    const limit = Math.min(200, parseInt(limitStr) || 50);

    const { data, error } = await db
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      res.json({ logs: [], message: 'Audit table not yet created.' });
      return;
    }

    res.json({ logs: data || [] });
  } catch (err) {
    log.error({ err }, 'Failed to fetch audit logs');
    next(err);
  }
});
