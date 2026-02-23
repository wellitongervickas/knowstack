/**
 * Category for audit log entries.
 * Runtime enum values: `AuditCategory` in `@/application/audit/audit.constants`.
 */
export type AuditCategory = 'DOCUMENT' | 'ADMIN' | 'AUDIT' | 'INSTRUCTION' | 'QUERY';

/**
 * Source of the request.
 */
export type AuditSource = 'mcp';

/**
 * Extensible metadata for audit log entries.
 */
export interface AuditLogMetadata {
  /** Allow additional metadata fields */
  [key: string]: unknown;
}

/**
 * AuditLog domain entity.
 * Represents an immutable audit trail entry.
 */
export interface AuditLog {
  id: string;
  timestamp: Date;

  // Action (what)
  action: string;
  category: AuditCategory;

  // Resource (on what)
  resourceType: string | null;
  resourceId: string | null;

  // Context
  organizationId: string | null;
  projectId: string | null;
  requestId: string | null;
  source: AuditSource | null;

  // Details (structured metadata) - sanitized before storage
  metadata: AuditLogMetadata;
}
