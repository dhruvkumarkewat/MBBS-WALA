import { Router, Request, Response, NextFunction } from 'express';
import { getPublicClient } from '../../config/database.js';
import { createChildLogger } from '../../utils/logger.js';

const log = createChildLogger('cutoffs');
export const cutoffsRoutes = Router();

/**
 * GET /api/v1/cutoffs
 * Search cutoffs with filtering by college, category, year, round, quota.
 */
cutoffsRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getPublicClient();
    const {
      college_name,
      college_id,
      category,
      year: yearStr,
      round,
      quota,
      state,
      course,
      limit: limitStr = '100',
      offset: offsetStr = '0',
    } = req.query as Record<string, string>;

    const limit = Math.min(500, Math.max(1, parseInt(limitStr) || 100));
    const offset = Math.max(0, parseInt(offsetStr) || 0);

    let query = db
      .from('cutoffs')
      .select('*', { count: 'exact' })
      .order('aiq_rank', { ascending: true, nullsFirst: false });

    // Filters
    if (college_name) query = query.ilike('college_name', `%${college_name}%`);
    if (college_id) query = query.eq('college_id', college_id);
    if (category && category !== 'All') query = query.eq('category', category);
    if (yearStr) query = query.eq('year', parseInt(yearStr));
    if (round) query = query.eq('round', round);
    if (quota) query = query.eq('quota', quota);
    if (state && state !== 'All') query = query.eq('state', state);

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      total: count || 0,
      limit,
      offset,
      results: data || [],
    });
  } catch (err) {
    log.error({ err }, 'Failed to fetch cutoffs');
    next(err);
  }
});

/**
 * GET /api/v1/cutoffs/history/:collegeName
 * Get historical cutoff trends for a specific college across years.
 */
cutoffsRoutes.get('/history/:collegeName', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getPublicClient();
    const { collegeName } = req.params;
    const { category = 'General', course = 'MBBS' } = req.query as Record<string, string>;

    const { data, error } = await db
      .from('cutoffs')
      .select('*')
      .ilike('college_name', `%${decodeURIComponent(collegeName)}%`)
      .order('year', { ascending: true });

    if (error) throw error;

    // Group by year for trend analysis
    const yearMap = new Map<number, any>();
    for (const row of data || []) {
      const year = row.year;
      if (!yearMap.has(year)) {
        yearMap.set(year, {
          year,
          college_name: row.college_name,
          aiq_rank: row.aiq_rank,
          aiq_score: row.aiq_score,
          state_rank_range: row.state_rank_range,
          state_score_range: row.state_score_range,
          category: row.category,
        });
      }
    }

    res.json({
      college_name: decodeURIComponent(collegeName),
      history: Array.from(yearMap.values()),
    });
  } catch (err) {
    log.error({ err }, 'Failed to fetch cutoff history');
    next(err);
  }
});

/**
 * GET /api/v1/cutoffs/years
 * Get available years for filter dropdown.
 */
cutoffsRoutes.get('/years', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getPublicClient();
    const { data, error } = await db
      .from('cutoffs')
      .select('year')
      .order('year', { ascending: false });

    if (error) throw error;

    const years = [...new Set((data || []).map((r: any) => r.year))].filter(Boolean);
    res.json({ years });
  } catch (err) {
    log.error({ err }, 'Failed to fetch years');
    next(err);
  }
});
