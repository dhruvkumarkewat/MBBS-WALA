import { getAdminClient } from '../config/database.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('notification');

/**
 * Notification Service
 *
 * Handles multi-channel notifications triggered by scraper events.
 * Channels: in_app, email, push (Firebase FCM)
 *
 * Flow:
 * 1. Event occurs (round started, result published, etc.)
 * 2. Match event to notification template
 * 3. Resolve recipients (all students, state-specific, etc.)
 * 4. Create notification queue entries
 * 5. Workers process the queue (in_app = instant, email/push = background)
 */
export class NotificationService {
  private db = getAdminClient();

  /**
   * Broadcast an administrative alert for critical crawler/counselling events.
   */
  async notifyAdmins(title: string, message: string, metadata?: Record<string, any>): Promise<void> {
    try {
      log.info({ title, metadata }, 'Dispatching admin notification');
      await this.db.from('notifications').insert({
        title,
        body: message,
        read: false,
        created_at: new Date().toISOString(),
      });
    } catch (err: any) {
      log.warn({ err: err.message }, 'Failed to insert admin notification');
    }
  }

  /**
   * Emit a counselling event notification.
   * Automatically resolves template, recipients, and creates queue entries.
   */
  async emitCounsellingEvent(params: CounsellingEventParams): Promise<number> {
    try {
      // 1. Find the matching template
      const { data: template } = await this.db
        .from('notification_templates')
        .select('*')
        .eq('event_type', params.eventType)
        .eq('is_active', true)
        .maybeSingle();

      if (!template) {
        log.warn({ eventType: params.eventType }, 'No active template for event type');
        return 0;
      }

      // 2. Render title and body from template
      const title = this.renderTemplate(template.title_template, params.variables);
      const body = this.renderTemplate(template.body_template, params.variables);

      // 3. Determine channels from template
      const channels: string[] = template.channels || ['in_app'];

      // 4. Get recipients
      const recipients = await this.getRecipients(params.targetAudience);

      // 5. Create queue entries for each recipient × channel
      let queued = 0;
      const batchSize = 500;

      for (let i = 0; i < recipients.length; i += batchSize) {
        const batch = recipients.slice(i, i + batchSize);
        const entries = [];

        for (const recipient of batch) {
          for (const channel of channels) {
            // Skip push if no FCM token
            if (channel === 'push' && !recipient.fcm_token) continue;

            entries.push({
              user_id: recipient.id,
              template_id: template.id,
              channel,
              title,
              body,
              data: params.data || null,
              official_url: params.officialUrl || null,
              priority: template.priority || 'normal',
              status: channel === 'in_app' ? 'delivered' : 'pending', // In-app is instant
            });
          }
        }

        if (entries.length > 0) {
          const { error } = await this.db.from('notification_queue').insert(entries);
          if (error) {
            log.error({ error }, 'Failed to insert notification batch');
          } else {
            queued += entries.length;
          }
        }
      }

      log.info(
        {
          eventType: params.eventType,
          recipients: recipients.length,
          queued,
          channels,
        },
        'Notifications queued'
      );

      return queued;
    } catch (err) {
      log.error({ err, eventType: params.eventType }, 'Failed to emit notification');
      return 0;
    }
  }

  /**
   * Get unread notification count for a user.
   */
  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await this.db
      .from('notification_queue')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('channel', 'in_app')
      .neq('status', 'read');

    return count || 0;
  }

  /**
   * Get notifications for a user (in-app).
   */
  async getUserNotifications(userId: string, limit = 20) {
    const { data, error } = await this.db
      .from('notification_queue')
      .select('*')
      .eq('user_id', userId)
      .eq('channel', 'in_app')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      log.error({ error }, 'Failed to fetch user notifications');
      return [];
    }
    return data || [];
  }

  /**
   * Mark a notification as read.
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.db
      .from('notification_queue')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', userId);
  }

  /**
   * Mark all notifications as read for a user.
   */
  async markAllAsRead(userId: string): Promise<void> {
    await this.db
      .from('notification_queue')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('channel', 'in_app')
      .neq('status', 'read');
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Render a template string by replacing {{variable}} placeholders.
   */
  private renderTemplate(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    }
    return result;
  }

  /**
   * Get target recipients based on audience specification.
   */
  private async getRecipients(
    audience: TargetAudience
  ): Promise<Array<{ id: string; fcm_token?: string }>> {
    let query = this.db.from('users_v2').select('id, fcm_token');

    if (audience.role) {
      query = query.eq('role', audience.role);
    }
    if (audience.state) {
      query = query.eq('state', audience.state);
    }
    if (audience.course) {
      query = query.eq('preferred_course', audience.course);
    }
    if (audience.userIds) {
      query = query.in('id', audience.userIds);
    }

    const { data, error } = await query;

    if (error) {
      // Fallback: try student_profiles if users_v2 doesn't exist yet
      log.warn({ error }, 'users_v2 query failed, trying student_profiles');
      const { data: fallback } = await this.db
        .from('student_profiles')
        .select('email');
      return (fallback || []).map((u: any) => ({ id: u.email }));
    }

    return data || [];
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CounsellingEventParams {
  eventType: string;               // Matches notification_templates.event_type
  variables: Record<string, string>; // Template variables: {{body_name}}, {{round_name}}, etc.
  targetAudience: TargetAudience;
  officialUrl?: string;
  data?: Record<string, any>;
}

export interface TargetAudience {
  role?: string;                   // 'student', 'admin', 'sub_admin'
  state?: string;                  // Only notify students from this state
  course?: string;                 // Only notify students interested in this course
  userIds?: string[];              // Specific users
}
