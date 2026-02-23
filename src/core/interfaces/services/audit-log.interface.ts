import { AuditCategory, AuditSource, AuditLogMetadata } from '@/core/entities/audit-log.entity';

/**
 * Input for logging an audit event.
 * Most fields are auto-enriched from TenantContext and RequestContext.
 */
export interface AuditLogEvent {
  // Required fields
  action: string;
  category: AuditCategory;

  // Resource (on what)
  resourceType?: string | null;
  resourceId?: string | null;

  // Context (auto-enriched from context if not provided)
  organizationId?: string | null;
  projectId?: string | null;
  requestId?: string | null;
  source?: AuditSource | null;

  // Details (structured metadata) - will be sanitized
  metadata?: AuditLogMetadata;
}

/**
 * Audit log service interface.
 * Provides fire-and-forget logging with auto-enrichment.
 */
export interface IAuditLogService {
  /**
   * Log an audit event.
   * Fire-and-forget: never throws, logs errors internally.
   * Auto-enriches from TenantContext and RequestContext.
   */
  log(event: AuditLogEvent): void;

  /**
   * Check if audit logging is enabled.
   */
  isEnabled(): boolean;
}

export const AUDIT_LOG_SERVICE = Symbol('AUDIT_LOG_SERVICE');
