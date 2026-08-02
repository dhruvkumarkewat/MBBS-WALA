import { Router, Request, Response } from 'express';

export const healthRoutes = Router();

healthRoutes.get('/', async (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'mbbswala-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});
