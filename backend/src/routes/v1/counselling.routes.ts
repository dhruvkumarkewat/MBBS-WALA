import { Router, Request, Response, NextFunction } from 'express';
import { getPublicClient, getAdminClient } from '../../config/database.js';
import { createChildLogger } from '../../utils/logger.js';

const log = createChildLogger('counselling');
export const counsellingRoutes = Router();

/**
 * GET /api/v1/counselling/rounds
 * Get counselling rounds with status (for the live tracker).
 */
counsellingRoutes.get('/rounds', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getPublicClient();
    const { body_code = 'MCC', year } = req.query as Record<string, string>;

    let query = db
      .from('counselling_rounds')
      .select(`
        *,
        counselling_sessions!inner (
          name,
          year,
          exam,
          counselling_bodies!inner ( code, name, website )
        )
      `)
      .order('round_number', { ascending: true });

    if (year) {
      query = query.eq('counselling_sessions.year', parseInt(year));
    }
    if (body_code) {
      query = query.eq('counselling_sessions.counselling_bodies.code', body_code);
    }

    const { data, error } = await query;

    if (error) {
      // If v2 tables don't exist yet, return empty gracefully
      log.warn({ error }, 'counselling_rounds query failed — table may not exist yet');
      res.json({ rounds: [], message: 'Counselling rounds table not yet populated.' });
      return;
    }

    res.json({ rounds: data || [] });
  } catch (err) {
    log.error({ err }, 'Failed to fetch rounds');
    next(err);
  }
});

/**
 * GET /api/v1/counselling/notices
 * Get latest counselling notices.
 */
counsellingRoutes.get('/notices', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getPublicClient();
    const { body_code, type, limit: limitStr = '20' } = req.query as Record<string, string>;
    const limit = Math.min(100, parseInt(limitStr) || 20);

    let query = db
      .from('counselling_notices')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (body_code) query = query.eq('body_id', body_code);
    if (type) query = query.eq('notice_type', type);

    const { data, error } = await query;

    if (error) {
      log.warn({ error }, 'counselling_notices query failed — table may not exist yet');
      res.json({ notices: [], message: 'Notices table not yet populated.' });
      return;
    }

    res.json({ notices: data || [] });
  } catch (err) {
    log.error({ err }, 'Failed to fetch notices');
    next(err);
  }
});

/**
 * GET /api/v1/counselling/active
 * Get the currently active counselling session and round.
 */
counsellingRoutes.get('/active', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getPublicClient();

    // Find active sessions
    const { data: sessions } = await db
      .from('counselling_sessions')
      .select('*')
      .eq('status', 'active');

    // Find active rounds
    const { data: rounds } = await db
      .from('counselling_rounds')
      .select('*')
      .not('status', 'in', '("locked","completed","cancelled")');

    res.json({
      active_sessions: sessions || [],
      active_rounds: rounds || [],
    });
  } catch (err) {
    log.error({ err }, 'Failed to fetch active counselling');
    next(err);
  }
});
