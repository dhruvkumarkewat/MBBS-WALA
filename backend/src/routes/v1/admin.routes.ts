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
 * POST /api/v1/admin/scraper/trigger
 * Manually trigger a scraper job.
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
