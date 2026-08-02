import { Router, Request, Response, NextFunction } from 'express';
import { PredictionService } from '../../services/prediction.service.js';
import { createChildLogger } from '../../utils/logger.js';
import { z } from 'zod';

const log = createChildLogger('predict');
export const predictRoutes = Router();

// ── Input validation schema ──────────────────────────────────────────────────
const predictInputSchema = z.object({
  rank: z.number().int().min(1).max(1500000),
  category: z.string().default('General'),
  state: z.string().optional(),
  domicile_state: z.string().optional(),
  gender: z.enum(['neutral', 'female', 'male']).default('neutral'),
  is_pwd: z.boolean().default(false),
  course: z.string().default('MBBS'),
  quota: z.string().default('AI'),
  round: z.string().optional(),
  limit: z.number().int().min(5).max(100).default(25),
});

/**
 * POST /api/v1/predict
 * Run the prediction engine. Returns ranked list of colleges with probability scores.
 */
predictRoutes.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parsed = predictInputSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Invalid input',
        details: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      });
      return;
    }

    const input = parsed.data;
    const startTime = Date.now();

    const predictionService = new PredictionService();
    const result = await predictionService.predict(input);

    const responseTime = Date.now() - startTime;

    // Log prediction for analytics (non-blocking)
    predictionService.logPrediction(input, result, responseTime).catch((err) => {
      log.warn({ err }, 'Failed to log prediction');
    });

    res.json({
      input: {
        rank: input.rank,
        category: input.category,
        course: input.course,
        state: input.state || 'All',
        quota: input.quota,
      },
      summary: result.summary,
      matches: result.matches,
      model_info: result.modelInfo,
      response_time_ms: responseTime,
      note: result.note,
    });
  } catch (err) {
    log.error({ err }, 'Prediction failed');
    next(err);
  }
});

/**
 * GET /api/v1/predict/quick?rank=10000&category=General
 * Quick prediction via GET (for simpler integrations).
 */
predictRoutes.get('/quick', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { rank: rankStr, category, state, course } = req.query as Record<string, string>;
    const rank = parseInt(rankStr);
    if (!rank || rank < 1) {
      res.status(400).json({ error: 'Valid rank is required' });
      return;
    }

    const predictionService = new PredictionService();
    const result = await predictionService.predict({
      rank,
      category: category || 'General',
      state,
      course: course || 'MBBS',
      quota: 'AI',
      gender: 'neutral',
      is_pwd: false,
      limit: 18,
    });

    res.json({
      rank,
      category: category || 'General',
      summary: result.summary,
      matches: result.matches,
    });
  } catch (err) {
    log.error({ err }, 'Quick prediction failed');
    next(err);
  }
});
