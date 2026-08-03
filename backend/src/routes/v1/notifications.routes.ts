import { Router, Request, Response, NextFunction } from 'express';
import { NotificationService } from '../../services/notification.service.js';
import { getPublicClient } from '../../config/database.js';
import { createChildLogger } from '../../utils/logger.js';

const log = createChildLogger('notifications');
export const notificationsRoutes = Router();

/**
 * GET /api/v1/notifications
 * Get active notifications (public — for the student dashboard banner).
 * Falls back to the existing `notifications` table for backward compatibility.
 */
notificationsRoutes.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const db = getPublicClient();
    const { all } = req.query as Record<string, string>;

    let query = db
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (all !== 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json(data || []);
  } catch (err) {
    log.error({ err }, 'Failed to fetch notifications');
    next(err);
  }
});

/**
 * GET /api/v1/notifications/user/:userId
 * Get a user's in-app notifications with unread count.
 */
notificationsRoutes.get('/user/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = String(req.params.userId);
    const { limit: limitStr = '20' } = req.query as Record<string, string>;
    const limit = Math.min(100, parseInt(limitStr) || 20);

    const notifService = new NotificationService();
    const [notifications, unreadCount] = await Promise.all([
      notifService.getUserNotifications(userId, limit),
      notifService.getUnreadCount(userId),
    ]);

    res.json({
      notifications,
      unread_count: unreadCount,
    });
  } catch (err) {
    log.error({ err }, 'Failed to fetch user notifications');
    next(err);
  }
});

/**
 * POST /api/v1/notifications/read/:id
 * Mark a notification as read.
 */
notificationsRoutes.post('/read/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = String(req.params.id);
    const { user_id } = req.body;

    if (!user_id) {
      res.status(400).json({ error: 'user_id is required' });
      return;
    }

    const notifService = new NotificationService();
    await notifService.markAsRead(id, user_id);

    res.json({ success: true });
  } catch (err) {
    log.error({ err }, 'Failed to mark notification as read');
    next(err);
  }
});

/**
 * POST /api/v1/notifications/read-all
 * Mark all notifications as read for a user.
 */
notificationsRoutes.post('/read-all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      res.status(400).json({ error: 'user_id is required' });
      return;
    }

    const notifService = new NotificationService();
    await notifService.markAllAsRead(user_id);

    res.json({ success: true });
  } catch (err) {
    log.error({ err }, 'Failed to mark all as read');
    next(err);
  }
});
