import { Router, Request, Response, NextFunction } from 'express';
import { getPublicClient } from '../../config/database.js';
import { createChildLogger } from '../../utils/logger.js';

const log = createChildLogger('colleges');
export const collegesRoutes = Router();

/**
 * GET /api/v1/colleges
 * Fetch colleges with search, filtering, and pagination.
 */
collegesRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getPublicClient();
    const {
      search,
      type,
      state,
      course,
      country,
      limit: limitStr = '50',
      offset: offsetStr = '0',
      sort = 'name',
      order = 'asc',
    } = req.query as Record<string, string>;

    const limit = Math.min(200, Math.max(1, parseInt(limitStr) || 50));
    const offset = Math.max(0, parseInt(offsetStr) || 0);

    // Use colleges_v2 if it exists, fall back to colleges
    let query = db
      .from('colleges')
      .select('*', { count: 'exact' })
      .order(sort === 'nirf' ? 'nirf' : 'name', { ascending: order !== 'desc', nullsFirst: false });

    // Filters
    if (search) {
      query = query.or(
        `name.ilike.%${search}%,city.ilike.%${search}%,state.ilike.%${search}%`
      );
    }
    if (state && state !== 'All') query = query.eq('state', state);
    if (type && type !== 'All') query = query.eq('college_type', type);
    if (course && course !== 'All') query = query.eq('course', course);
    if (country && country !== 'All') {
      query = query.ilike('country', country);
    } else if (!country) {
      query = query.ilike('country', 'INDIA');
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    res.json({
      total: count || 0,
      limit,
      offset,
      colleges: data || [],
    });
  } catch (err) {
    log.error({ err }, 'Failed to fetch colleges');
    next(err);
  }
});

/**
 * GET /api/v1/colleges/:id
 * Get a single college by ID with related data.
 */
collegesRoutes.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getPublicClient();
    const { id } = req.params;

    // Fetch college
    const { data: college, error } = await db
      .from('colleges')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!college) {
      res.status(404).json({ error: 'College not found' });
      return;
    }

    // Fetch related cutoffs (latest year)
    const { data: cutoffs } = await db
      .from('cutoffs')
      .select('*')
      .eq('college_name', college.name)
      .order('year', { ascending: false })
      .limit(20);

    // Fetch seat matrix
    const { data: seats } = await db
      .from('seat_matrix')
      .select('*')
      .ilike('college_name', `%${college.name.substring(0, 30)}%`)
      .limit(5);

    res.json({
      ...college,
      cutoffs: cutoffs || [],
      seat_matrix: seats || [],
    });
  } catch (err) {
    log.error({ err }, 'Failed to fetch college');
    next(err);
  }
});

/**
 * GET /api/v1/colleges/states/list
 * Get unique states for filter dropdowns.
 */
collegesRoutes.get('/states/list', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getPublicClient();
    const { data, error } = await db
      .from('colleges')
      .select('state')
      .not('state', 'is', null)
      .order('state');

    if (error) throw error;

    const uniqueStates = [...new Set((data || []).map((r: any) => r.state))].filter(Boolean);
    res.json({ states: uniqueStates });
  } catch (err) {
    log.error({ err }, 'Failed to fetch states');
    next(err);
  }
});
