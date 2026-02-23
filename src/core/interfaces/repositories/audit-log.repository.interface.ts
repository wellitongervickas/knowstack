import {
  AuditLog,
  AuditCategory,
  AuditSource,
  AuditLogMetadata,
} from '@/core/entities/audit-log.entity';

/**
 * Input for creating a new audit log entry.
 */
export interface CreateAuditLogInput {
  // Action (what)
  action: string;
  category: AuditCategory;

  // Resource (on what)
  resourceType?: string | null;
  resourceId?: string | null;

  // Context
  organizationId?: string | null;
  projectId?: string | null;
  requestId?: string | null;
  source?: AuditSource | null;

  // Details (structured metadata)
  metadata?: AuditLogMetadata;
}

/**
 * Filters for querying audit logs.
 */
export interface AuditLogQueryFilters {
  category?: AuditCategory;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  organizationId?: string;
  from?: Date;
  to?: Date;
}

/**
 * Pagination options for audit log queries.
 */
export interface AuditLogPagination {
  page: number;
  limit: number;
}

/**
 * Paginated result from audit log queries.
 */
export interface AuditLogPaginatedResult {
  data: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Result from delete operations.
 */
export interface DeleteResult {
  count: number;
}

/**
 * Repository interface for audit log operations.
 * Infrastructure layer must implement this interface.
 *
 * NOTE: No UPDATE/DELETE methods - audit logs are immutable.
 * Retention cleanup is handled internally by the repository.
 */
export interface IAuditLogRepository {
  /**
   * Create a new audit log entry.
   */
  create(input: CreateAuditLogInput): Promise<AuditLog>;

  /**
   * Find audit logs by organization with filters and pagination.
   */
  findByOrganization(
    organizationId: string,
    filters: AuditLogQueryFilters,
    pagination: AuditLogPagination,
  ): Promise<AuditLogPaginatedResult>;

  /**
   * Count total audit logs for an organization.
   */
  countByOrganization(organizationId: string): Promise<number>;

  /**
   * Delete audit logs older than the specified date.
   * Returns count of deleted records.
   * Used for retention policy enforcement.
   */
  deleteOlderThan(cutoffDate: Date, batchSize: number): Promise<DeleteResult>;
}

export const AUDIT_LOG_REPOSITORY = Symbol('AUDIT_LOG_REPOSITORY');
