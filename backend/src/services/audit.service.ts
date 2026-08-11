import { getAdminClient } from '../config/database.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('audit');

/**
 * Audit Service — logs every action for complete traceability.
 *
 * Every data change, admin action, scraper run, and prediction
 * is recorded with: who, when, what changed, old/new values, and why.
 */
export class AuditService {
  private db = getAdminClient();

  /**
   * Log a generic action.
   */
  async log(params: AuditLogParams): Promise<void> {
    try {
      await this.db.from('audit_logs').insert({
        user_email: params.userEmail || null,
        action: params.action,
        entity_type: params.entityType || null,
        entity_id: params.entityId || null,
        old_value: params.oldValue || null,
        new_value: params.newValue || null,
        ip_address: params.ipAddress || null,
        user_agent: params.userAgent || null,
        metadata: params.metadata || null,
      });
    } catch (err) {
      // Audit logging should never break the main flow
      log.warn({ err, action: params.action }, 'Failed to write audit log');
    }
  }

  /**
   * Log a data change (INSERT, UPDATE, DELETE) with version history.
   */
  async logDataChange(params: DataChangeParams): Promise<void> {
    try {
      // Write to data_versions table
      await this.db.from('data_versions').insert({
        table_name: params.tableName,
        record_id: params.recordId,
        version: params.version,
        operation: params.operation,
        old_data: params.oldData || null,
        new_data: params.newData || null,
        changed_by: params.changedBy,
        change_reason: params.reason || null,
        source: params.source || null,
      });

      // Also write to audit_logs for unified view
      await this.log({
        userEmail: params.changedBy,
        action: `data_${params.operation.toLowerCase()}`,
        entityType: params.tableName,
        entityId: params.recordId,
        oldValue: params.oldData,
        newValue: params.newData,
        metadata: { version: params.version, reason: params.reason },
      });
    } catch (err) {
      log.warn({ err }, 'Failed to write data change log');
    }
  }

  /**
   * Log a scraper event.
   */
  async logScraperEvent(
    bodyCode: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.log({
      userEmail: `scraper:${bodyCode}`,
      action: `scraper_${action}`,
      entityType: 'scraper_run',
      metadata: { body_code: bodyCode, ...details },
    });
  }

  /**
   * Log an admin action.
   */
  async logAdminAction(
    adminEmail: string,
    action: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.log({
      userEmail: adminEmail,
      action: `admin_${action}`,
      metadata: details,
    });
  }

  /**
   * Get recent audit logs with optional filters.
   */
  async getRecentLogs(params: {
    limit?: number;
    action?: string;
    entityType?: string;
    userEmail?: string;
  }) {
    let query = this.db
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(params.limit || 50);

    if (params.action) query = query.eq('action', params.action);
    if (params.entityType) query = query.eq('entity_type', params.entityType);
    if (params.userEmail) query = query.eq('user_email', params.userEmail);

    const { data, error } = await query;
    if (error) {
      log.warn({ error }, 'Failed to fetch audit logs');
      return [];
    }
    return data || [];
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditLogParams {
  userEmail?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface DataChangeParams {
  tableName: string;
  recordId: string;
  version: number;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  oldData?: Record<string, any>;
  newData?: Record<string, any>;
  changedBy: string;
  reason?: string;
  source?: string;
}
