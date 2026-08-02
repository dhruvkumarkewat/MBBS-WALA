import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { healthRoutes } from './routes/health.routes.js';
import { collegesRoutes } from './routes/v1/colleges.routes.js';
import { cutoffsRoutes } from './routes/v1/cutoffs.routes.js';
import { predictRoutes } from './routes/v1/predict.routes.js';
import { referenceRoutes } from './routes/v1/reference.routes.js';
import { counsellingRoutes } from './routes/v1/counselling.routes.js';
import { adminRoutes } from './routes/v1/admin.routes.js';
import { notificationsRoutes } from './routes/v1/notifications.routes.js';

const app = express();

// ── Security middleware ──────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = env.CORS_ORIGINS.split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        callback(null, true); // In dev, allow all; tighten in production
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.NODE_ENV === 'production' ? 200 : 1000, // More lenient in dev
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// ── Request logging ──────────────────────────────────────────────────────────
app.use(requestLogger);

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/health', healthRoutes);
app.use('/api/v1/colleges', collegesRoutes);
app.use('/api/v1/cutoffs', cutoffsRoutes);
app.use('/api/v1/predict', predictRoutes);
app.use('/api/v1/reference', referenceRoutes);
app.use('/api/v1/counselling', counsellingRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/notifications', notificationsRoutes);

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(env.PORT, () => {
  logger.info(`🚀 MBBS Wala API running on port ${env.PORT} [${env.NODE_ENV}]`);
  logger.info(`📡 Health: http://localhost:${env.PORT}/health`);
  logger.info(`📚 API:    http://localhost:${env.PORT}/api/v1`);

  // Start automated scraper cron jobs
  if (env.NODE_ENV !== 'test') {
    import('./jobs/cron.js')
      .then(({ startCronJobs }) => {
        startCronJobs();
        logger.info('🔄 Automated scraper cron jobs started');
      })
      .catch((err) => {
        logger.warn({ err }, 'Cron jobs not started (Redis may not be available)');
      });
  }
});

export default app;
