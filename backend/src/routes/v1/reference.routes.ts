import { Router, Request, Response, NextFunction } from 'express';
import { getPublicClient } from '../../config/database.js';
import { createChildLogger } from '../../utils/logger.js';

const log = createChildLogger('reference');
export const referenceRoutes = Router();

/**
 * GET /api/v1/reference/exams
 * List supported entrance exams.
 */
referenceRoutes.get('/exams', async (_req: Request, res: Response) => {
  res.json({
    exams: [
      { code: 'NEET_UG', name: 'NEET UG', full_name: 'National Eligibility cum Entrance Test (Undergraduate)' },
      { code: 'NEET_PG', name: 'NEET PG', full_name: 'National Eligibility cum Entrance Test (Postgraduate)' },
    ],
  });
});

/**
 * GET /api/v1/reference/categories
 * List all reservation categories.
 */
referenceRoutes.get('/categories', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      categories: [
        { code: 'General', name: 'Unreserved (General)', is_pwd: false },
        { code: 'OBC', name: 'Other Backward Classes', is_pwd: false },
        { code: 'SC', name: 'Scheduled Castes', is_pwd: false },
        { code: 'ST', name: 'Scheduled Tribes', is_pwd: false },
        { code: 'EWS', name: 'Economically Weaker Sections', is_pwd: false },
        { code: 'General_PwD', name: 'Unreserved PwD', is_pwd: true },
        { code: 'OBC_PwD', name: 'OBC PwD', is_pwd: true },
        { code: 'SC_PwD', name: 'SC PwD', is_pwd: true },
        { code: 'ST_PwD', name: 'ST PwD', is_pwd: true },
        { code: 'EWS_PwD', name: 'EWS PwD', is_pwd: true },
      ],
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/v1/reference/quotas
 * List all quota types.
 */
referenceRoutes.get('/quotas', async (_req: Request, res: Response) => {
  res.json({
    quotas: [
      { code: 'AI', name: 'All India Quota' },
      { code: 'HS', name: 'Home State' },
      { code: 'OS', name: 'Other State' },
      { code: 'IP', name: 'Internal (Deemed/Private)' },
      { code: 'MQ', name: 'Management Quota' },
      { code: 'NRI', name: 'NRI Quota' },
    ],
  });
});

/**
 * GET /api/v1/reference/states
 * List all Indian states.
 */
referenceRoutes.get('/states', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getPublicClient();

    // Try states table first, fall back to unique states from colleges
    const { data, error } = await db
      .from('colleges')
      .select('state')
      .not('state', 'is', null)
      .order('state');

    if (error) throw error;

    const states = [...new Set((data || []).map((r: any) => r.state))].filter(Boolean).sort();
    res.json({ states });
  } catch (err) {
    log.error({ err }, 'Failed to fetch states');
    next(err);
  }
});

/**
 * GET /api/v1/reference/courses
 * List supported medical courses.
 */
referenceRoutes.get('/courses', async (_req: Request, res: Response) => {
  res.json({
    courses: [
      { code: 'MBBS', name: 'MBBS', category: 'Allopathy', exam: 'NEET UG', authority: 'MCC / State' },
      { code: 'BDS', name: 'BDS', category: 'Dental', exam: 'NEET UG', authority: 'MCC / State' },
      { code: 'BAMS', name: 'BAMS', category: 'AYUSH', exam: 'NEET UG', authority: 'AACCC / State AYUSH' },
      { code: 'BHMS', name: 'BHMS', category: 'AYUSH', exam: 'NEET UG', authority: 'AACCC / State AYUSH' },
      { code: 'BUMS', name: 'BUMS', category: 'AYUSH', exam: 'NEET UG', authority: 'AACCC / State AYUSH' },
      { code: 'BSMS', name: 'BSMS', category: 'AYUSH', exam: 'NEET UG', authority: 'AACCC / State AYUSH' },
      { code: 'BNYS', name: 'BNYS', category: 'AYUSH', exam: 'NEET UG', authority: 'AACCC / State' },
    ],
  });
});
