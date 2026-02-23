import { RequestSource } from '@/common/types/request-context.type';

/**
 * Context for structured log entries.
 * All fields are optional - service will enrich from CLS context.
 */
export interface LogContext {
  requestId?: string;
  source?: RequestSource;
  organizationId?: string;
  projectId?: string;
  provider?: string;
  model?: string;
  latencyMs?: number;
  totalTokens?: number;
  method?: string;
  path?: string;
  statusCode?: number;
  errorCode?: string;
  [key: string]: unknown;
}

/**
 * Structured logger interface for observability.
 * Emits JSON logs with consistent format and automatic context enrichment.
 */
export interface IStructuredLogger {
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, error?: Error, context?: LogContext): void;
  debug(message: string, context?: LogContext): void;
}

/**
 * Labels for Prometheus metrics.
 */
export interface MetricLabels {
  provider: string;
  source: RequestSource;
}

/**
 * Labels for cache-related Prometheus metrics.
 */
export interface CacheMetricLabels {
  projectId: string;
}

/**
 * Labels for audit log Prometheus metrics.
 */
export interface AuditLogMetricLabels {
  category: string;
}

/**
 * Metrics service interface for Prometheus-compatible metrics.
 */
export interface IMetricsService {
  /** Increment total queries counter */
  incrementQueryTotal(labels: MetricLabels): void;

  /** Increment query errors counter */
  incrementQueryErrors(labels: MetricLabels): void;

  /** Record query latency in histogram */
  recordQueryLatency(latencyMs: number, labels: MetricLabels): void;

  /** Increment cache hits counter */
  incrementCacheHits(labels: CacheMetricLabels): void;

  /** Increment cache misses counter */
  incrementCacheMisses(labels: CacheMetricLabels): void;

  /** Increment audit log writes counter */
  incrementAuditLogWrites(labels: AuditLogMetricLabels): void;

  /** Increment audit log write failures counter */
  incrementAuditLogWriteFailures(labels: AuditLogMetricLabels): void;

  /** Record audit log cleanup deleted count */
  recordAuditLogCleanup(deletedCount: number): void;

  /** Increment audit log cleanup failures counter */
  incrementAuditLogCleanupFailures(): void;

  /** Record audit log write operation duration in milliseconds */
  recordAuditLogWriteDuration(durationMs: number): void;

  /** Record audit log query operation duration in milliseconds */
  recordAuditLogQueryDuration(durationMs: number): void;

  /** Get metrics in Prometheus text format */
  getMetrics(): string;
}

// Injection tokens
export const STRUCTURED_LOGGER = Symbol('STRUCTURED_LOGGER');
export const METRICS_SERVICE = Symbol('METRICS_SERVICE');

// ============================================================================
// SCAFFOLD: Future implementations (interfaces only, not implemented)
// ============================================================================

/**
 * SCAFFOLD: Trace context for distributed tracing.
 * To be implemented when adding OpenTelemetry or similar.
 */
export interface ITraceContext {
  traceId?: string;
  spanId?: string;
  parentSpanId?: string;
}

/**
 * SCAFFOLD: External error reporting interface (Sentry-like).
 * To be implemented for production error tracking.
 */
export interface IErrorReporter {
  /** Capture and report an exception */
  captureException(error: Error, context?: Record<string, unknown>): void;

  /** Capture and report a message */
  captureMessage(
    message: string,
    level: 'info' | 'warning' | 'error',
    context?: Record<string, unknown>,
  ): void;
}

export const ERROR_REPORTER = Symbol('ERROR_REPORTER');

/**
 * SCAFFOLD: No-op error reporter for development.
 * Replace with Sentry or similar in production.
 */
export class NoOpErrorReporter implements IErrorReporter {
  captureException(_error: Error, _context?: Record<string, unknown>): void {
    // SCAFFOLD: Implement Sentry/similar integration
  }

  captureMessage(
    _message: string,
    _level: 'info' | 'warning' | 'error',
    _context?: Record<string, unknown>,
  ): void {
    // SCAFFOLD: Implement Sentry/similar integration
  }
}
