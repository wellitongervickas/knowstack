import { Injectable, Inject, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  IAuditLogRepository,
  AUDIT_LOG_REPOSITORY,
  CreateAuditLogInput,
} from '@/core/interfaces/repositories/audit-log.repository.interface';
import { IAuditLogService, AuditLogEvent } from '@/core/interfaces/services/audit-log.interface';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
  IMetricsService,
  METRICS_SERVICE,
} from '@/core/interfaces/services/observability.interface';
import { TenantContextService } from '@/common/services/tenant-context.service';
import { RequestContextService } from '@/common/services/request-context.service';
import { MetadataSanitizer } from '@/application/audit/services/metadata-sanitizer';
import {
  AUDIT_LOG_ENABLED,
  AUDIT_LOG_RETENTION_DAYS,
  AUDIT_LOG_CLEANUP_INTERVAL_MS,
  AUDIT_LOG_BATCH_DELETE_SIZE,
} from '@/app.settings';

/**
 * Audit log service for event logging.
 * Implements fire-and-forget pattern with auto-enrichment.
 *
 * Features:
 * - Fire-and-forget: Never throws, logs errors internally
 * - Auto-enrichment from TenantContext and RequestContext
 * - Metadata sanitization (strips sensitive fields)
 * - Configurable retention with automatic cleanup
 * - Metrics instrumentation for observability
 */
@Injectable()
export class AuditLogService implements IAuditLogService, OnModuleInit, OnModuleDestroy {
  private readonly internalLogger = new Logger(AuditLogService.name);
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly enabled = AUDIT_LOG_ENABLED;
  private readonly retentionDays = AUDIT_LOG_RETENTION_DAYS;
  private readonly cleanupIntervalMs = AUDIT_LOG_CLEANUP_INTERVAL_MS;
  private readonly batchDeleteSize = AUDIT_LOG_BATCH_DELETE_SIZE;

  constructor(
    @Inject(AUDIT_LOG_REPOSITORY)
    private readonly repository: IAuditLogRepository,
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
    @Inject(METRICS_SERVICE)
    private readonly metrics: IMetricsService,
    private readonly tenantContext: TenantContextService,
    private readonly requestContext: RequestContextService,
    private readonly metadataSanitizer: MetadataSanitizer,
  ) {}

  onModuleInit(): void {
    if (this.enabled) {
      this.internalLogger.log(
        `Audit logging enabled (retention: ${this.retentionDays} days, cleanup: every ${this.cleanupIntervalMs}ms)`,
      );
      // Start cleanup job
      this.cleanupInterval = setInterval(() => this.runCleanup(), this.cleanupIntervalMs);
    } else {
      this.internalLogger.log('Audit logging disabled');
    }
  }

  onModuleDestroy(): void {
    // Prevent memory leak by clearing the interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.internalLogger.log('Audit log cleanup interval cleared');
    }
  }

  /**
   * Check if audit logging is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Log an audit event.
   * Fire-and-forget: never throws, logs errors internally.
   * Auto-enriches from TenantContext and RequestContext.
   */
  log(event: AuditLogEvent): void {
    if (!this.enabled) {
      return;
    }

    // Fire and forget - don't await, catch errors
    this.logAsync(event).catch((error) => {
      // This should never happen due to internal try-catch, but just in case
      this.internalLogger.error(
        `Unexpected error in audit log fire-and-forget: ${error instanceof Error ? error.message : error}`,
      );
    });
  }

  /**
   * Internal async logging with full error handling.
   */
  private async logAsync(event: AuditLogEvent): Promise<void> {
    const startTime = Date.now();
    try {
      const enriched = this.enrichFromContext(event);
      const sanitized = this.sanitizeEvent(enriched);
      const input = this.toCreateInput(sanitized);

      await this.repository.create(input);

      // Record timing metrics
      this.metrics.recordAuditLogWriteDuration(Date.now() - startTime);

      // Increment success metrics
      this.metrics.incrementAuditLogWrites({ category: event.category });
    } catch (error) {
      // Record timing even on failure for complete latency picture
      this.metrics.recordAuditLogWriteDuration(Date.now() - startTime);

      // NEVER throw - fire-and-forget
      this.logger.error('Audit log write failed', error as Error, {
        action: event.action,
        category: event.category,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
      });

      // Increment failure metrics
      this.metrics.incrementAuditLogWriteFailures({ category: event.category });
    }
  }

  /**
   * Enrich event with context from TenantContext and RequestContext.
   * Uses *OrNull methods for null safety.
   */
  private enrichFromContext(event: AuditLogEvent): AuditLogEvent {
    const tenant = this.tenantContext.getContextOrNull();
    const request = this.requestContext.getContextOrNull();

    return {
      ...event,
      organizationId: event.organizationId ?? tenant?.organization?.id ?? null,
      projectId: event.projectId ?? tenant?.project?.id ?? null,
      requestId: event.requestId ?? request?.requestId ?? null,
      source: event.source ?? (request?.source as AuditLogEvent['source']) ?? null,
    };
  }

  /**
   * Sanitize event metadata to remove sensitive fields.
   */
  private sanitizeEvent(event: AuditLogEvent): AuditLogEvent {
    return {
      ...event,
      metadata: this.metadataSanitizer.sanitize(event.metadata),
    };
  }

  /**
   * Convert event to repository input format.
   */
  private toCreateInput(event: AuditLogEvent): CreateAuditLogInput {
    return {
      action: event.action,
      category: event.category,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      organizationId: event.organizationId,
      projectId: event.projectId,
      requestId: event.requestId,
      source: event.source,
      metadata: event.metadata,
    };
  }

  /**
   * Run retention cleanup job.
   * Deletes audit logs older than retention period in batches.
   */
  private async runCleanup(): Promise<void> {
    try {
      const cutoffDate = new Date(Date.now() - this.retentionDays * 24 * 60 * 60 * 1000);

      let totalDeleted = 0;
      let batchDeleted = 0;

      do {
        const result = await this.repository.deleteOlderThan(cutoffDate, this.batchDeleteSize);
        batchDeleted = result.count;
        totalDeleted += batchDeleted;

        // Continue until we delete less than a full batch
      } while (batchDeleted === this.batchDeleteSize);

      if (totalDeleted > 0) {
        this.internalLogger.log(
          `Audit log cleanup: deleted ${totalDeleted} records older than ${cutoffDate.toISOString()}`,
        );
        // Record cleanup metrics
        this.metrics.recordAuditLogCleanup(totalDeleted);
      }
    } catch (error) {
      this.logger.error('Audit log cleanup failed', error as Error);
      // Track cleanup failures in metrics for alerting
      this.metrics.incrementAuditLogCleanupFailures();
    }
  }
}
