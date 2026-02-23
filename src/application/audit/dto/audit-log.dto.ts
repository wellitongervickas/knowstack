import { AuditLog, AuditLogMetadata } from '@/core/entities/audit-log.entity';

/**
 * Response DTO for a single audit log entry.
 */
export interface AuditLogResponseDto {
  id: string;
  timestamp: string;

  // Action
  action: string;
  category: string;

  // Resource
  resourceType: string | null;
  resourceId: string | null;

  // Context
  organizationId: string | null;
  projectId: string | null;
  requestId: string | null;
  source: string | null;

  // Details
  metadata: AuditLogMetadata;
}

/**
 * Pagination metadata for audit log responses.
 */
export interface AuditLogPaginationDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginated response DTO for audit log queries.
 */
export interface AuditLogListResponseDto {
  data: AuditLogResponseDto[];
  pagination: AuditLogPaginationDto;
}

/**
 * Map audit log entity to response DTO.
 */
export function mapAuditLogToResponse(log: AuditLog): AuditLogResponseDto {
  return {
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    action: log.action,
    category: log.category,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    organizationId: log.organizationId,
    projectId: log.projectId,
    requestId: log.requestId,
    source: log.source,
    metadata: log.metadata,
  };
}
