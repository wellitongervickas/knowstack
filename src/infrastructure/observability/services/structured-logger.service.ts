import { Injectable, Logger, Optional } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context.service';
import { TenantContextService } from '@/common/services/tenant-context.service';
import { IStructuredLogger, LogContext } from '@/core/interfaces/services/observability.interface';

/**
 * Structured logger that emits JSON logs with consistent format.
 *
 * Automatically enriches logs with:
 * - requestId, source from RequestContextService
 * - organizationId, projectId from TenantContextService (when available)
 *
 * Log format:
 * {
 *   "timestamp": "ISO8601",
 *   "level": "info|warn|error|debug",
 *   "requestId": "uuid",
 *   "source": "api|mcp",
 *   "organizationId": "org_xxx",
 *   "projectId": "proj_xxx",
 *   "provider": "openai",
 *   "model": "gpt-4o-mini",
 *   "latencyMs": 450,
 *   "totalTokens": 1200,
 *   "message": "..."
 * }
 */
@Injectable()
export class StructuredLoggerService implements IStructuredLogger {
  private readonly logger = new Logger('StructuredLogger');

  constructor(
    private readonly requestContext: RequestContextService,
    @Optional() private readonly tenantContext?: TenantContextService,
  ) {}

  info(message: string, context?: LogContext): void {
    const entry = this.buildLogEntry('info', message, context);
    this.logger.log(JSON.stringify(entry));
  }

  warn(message: string, context?: LogContext): void {
    const entry = this.buildLogEntry('warn', message, context);
    this.logger.warn(JSON.stringify(entry));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.buildLogEntry('error', message, context);
    // Include error details in log but not in client response
    if (error) {
      (entry as Record<string, unknown>).errorName = error.name;
      (entry as Record<string, unknown>).errorMessage = error.message;
      // Stack trace only in logs, never to clients
      (entry as Record<string, unknown>).stack = error.stack;
    }
    this.logger.error(JSON.stringify(entry));
  }

  debug(message: string, context?: LogContext): void {
    const entry = this.buildLogEntry('debug', message, context);
    this.logger.debug(JSON.stringify(entry));
  }

  private buildLogEntry(
    level: string,
    message: string,
    context?: LogContext,
  ): Record<string, unknown> {
    const reqCtx = this.requestContext.getContextOrNull();
    const tenant = this.tenantContext?.getContextOrNull() ?? null;

    // Build base entry with automatic enrichment
    const entry: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
      requestId: reqCtx?.requestId ?? context?.requestId ?? 'unknown',
      source: reqCtx?.source ?? context?.source ?? 'api',
      message,
    };

    // Add tenant context if available
    if (tenant) {
      entry.organizationId = tenant.organization.id;
      if (tenant.project) {
        entry.projectId = tenant.project.id;
      }
    } else if (context?.organizationId || context?.projectId) {
      entry.organizationId = context.organizationId;
      entry.projectId = context.projectId;
    }

    // Add optional context fields
    if (context?.provider) entry.provider = context.provider;
    if (context?.model) entry.model = context.model;
    if (context?.latencyMs !== undefined) entry.latencyMs = context.latencyMs;
    if (context?.totalTokens !== undefined) entry.totalTokens = context.totalTokens;
    if (context?.method) entry.method = context.method;
    if (context?.path) entry.path = context.path;
    if (context?.statusCode !== undefined) entry.statusCode = context.statusCode;
    if (context?.errorCode) entry.errorCode = context.errorCode;

    // Add any extra context fields
    for (const [key, value] of Object.entries(context ?? {})) {
      if (
        ![
          'requestId',
          'source',
          'organizationId',
          'projectId',
          'provider',
          'model',
          'latencyMs',
          'totalTokens',
          'method',
          'path',
          'statusCode',
          'errorCode',
        ].includes(key) &&
        value !== undefined
      ) {
        entry[key] = value;
      }
    }

    return entry;
  }
}
