import { Injectable } from '@nestjs/common';
import {
  IMetricsService,
  MetricLabels,
  CacheMetricLabels,
  AuditLogMetricLabels,
} from '@/core/interfaces/services/observability.interface';

/**
 * In-memory Prometheus-compatible metrics service.
 *
 * Exposes:
 * - knowstack_queries_total{provider,source} counter
 * - knowstack_query_errors_total{provider,source} counter
 * - knowstack_query_latency_ms{provider,source} histogram
 * - knowstack_audit_log_writes_total{category} counter
 * - knowstack_audit_log_write_failures_total{category} counter
 * - knowstack_audit_log_cleanup_deleted_count counter (no labels)
 */
@Injectable()
export class MetricsService implements IMetricsService {
  // Counters: metric name -> label key -> count
  private readonly counters = new Map<string, Map<string, number>>();

  // Histogram data: metric name -> label key -> array of latency values
  private readonly histogramValues = new Map<string, Map<string, number[]>>();

  // Standard histogram buckets (in ms)
  private readonly buckets = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000];

  incrementQueryTotal(labels: MetricLabels): void {
    this.incrementCounter('knowstack_queries_total', this.queryLabelsToKey(labels));
  }

  incrementQueryErrors(labels: MetricLabels): void {
    this.incrementCounter('knowstack_query_errors_total', this.queryLabelsToKey(labels));
  }

  recordQueryLatency(latencyMs: number, labels: MetricLabels): void {
    this.recordHistogram('knowstack_query_latency_ms', latencyMs, this.queryLabelsToKey(labels));
  }

  incrementCacheHits(labels: CacheMetricLabels): void {
    this.incrementCounter('knowstack_query_cache_hits_total', this.cacheLabelsToKey(labels));
  }

  incrementCacheMisses(labels: CacheMetricLabels): void {
    this.incrementCounter('knowstack_query_cache_misses_total', this.cacheLabelsToKey(labels));
  }

  incrementAuditLogWrites(labels: AuditLogMetricLabels): void {
    this.incrementCounter('knowstack_audit_log_writes_total', this.auditLogLabelsToKey(labels));
  }

  incrementAuditLogWriteFailures(labels: AuditLogMetricLabels): void {
    this.incrementCounter(
      'knowstack_audit_log_write_failures_total',
      this.auditLogLabelsToKey(labels),
    );
  }

  recordAuditLogCleanup(deletedCount: number): void {
    // Use a special counter for cleanup operations
    // We record the total count as a counter without labels
    this.incrementCounter('knowstack_audit_log_cleanup_deleted_count', '', deletedCount);
  }

  incrementAuditLogCleanupFailures(): void {
    this.incrementCounter('knowstack_audit_log_cleanup_failures_total', '');
  }

  recordAuditLogWriteDuration(durationMs: number): void {
    this.recordHistogram('knowstack_audit_log_write_duration_ms', durationMs, '');
  }

  recordAuditLogQueryDuration(durationMs: number): void {
    this.recordHistogram('knowstack_audit_log_query_duration_ms', durationMs, '');
  }

  getMetrics(): string {
    const lines: string[] = [];

    // Query Counters
    this.appendCounter(lines, 'knowstack_queries_total', 'Total number of queries processed');
    this.appendCounter(lines, 'knowstack_query_errors_total', 'Total number of query errors');
    this.appendCounter(
      lines,
      'knowstack_query_cache_hits_total',
      'Total number of query cache hits',
    );
    this.appendCounter(
      lines,
      'knowstack_query_cache_misses_total',
      'Total number of query cache misses',
    );

    // Audit Log Counters
    this.appendCounter(
      lines,
      'knowstack_audit_log_writes_total',
      'Total number of audit log writes',
    );
    this.appendCounter(
      lines,
      'knowstack_audit_log_write_failures_total',
      'Total number of audit log write failures',
    );
    this.appendCounter(
      lines,
      'knowstack_audit_log_cleanup_deleted_count',
      'Total number of audit logs deleted during cleanup operations',
    );
    this.appendCounter(
      lines,
      'knowstack_audit_log_cleanup_failures_total',
      'Total number of audit log cleanup job failures',
    );

    // Histograms
    this.appendHistogram(lines, 'knowstack_query_latency_ms', 'Query latency in milliseconds');
    this.appendHistogram(
      lines,
      'knowstack_audit_log_write_duration_ms',
      'Duration of audit log write operations in milliseconds',
    );
    this.appendHistogram(
      lines,
      'knowstack_audit_log_query_duration_ms',
      'Duration of audit log query operations in milliseconds',
    );

    return lines.join('\n');
  }

  private incrementCounter(name: string, labelKey: string, amount: number = 1): void {
    if (!this.counters.has(name)) {
      this.counters.set(name, new Map());
    }
    const counter = this.counters.get(name)!;
    counter.set(labelKey, (counter.get(labelKey) ?? 0) + amount);
  }

  private recordHistogram(name: string, value: number, labelKey: string): void {
    if (!this.histogramValues.has(name)) {
      this.histogramValues.set(name, new Map());
    }
    const histogram = this.histogramValues.get(name)!;
    if (!histogram.has(labelKey)) {
      histogram.set(labelKey, []);
    }
    histogram.get(labelKey)!.push(value);
  }

  private queryLabelsToKey(labels: MetricLabels): string {
    return `provider="${labels.provider}",source="${labels.source}"`;
  }

  private cacheLabelsToKey(labels: CacheMetricLabels): string {
    return `projectId="${labels.projectId}"`;
  }

  private auditLogLabelsToKey(labels: AuditLogMetricLabels): string {
    return `category="${labels.category}"`;
  }

  private appendCounter(lines: string[], name: string, help: string): void {
    const counter = this.counters.get(name);
    if (!counter || counter.size === 0) {
      return;
    }

    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} counter`);

    for (const [labelKey, value] of counter.entries()) {
      lines.push(`${name}{${labelKey}} ${value}`);
    }
    lines.push('');
  }

  private appendHistogram(lines: string[], name: string, help: string): void {
    const histogram = this.histogramValues.get(name);
    if (!histogram || histogram.size === 0) {
      return;
    }

    lines.push(`# HELP ${name} ${help}`);
    lines.push(`# TYPE ${name} histogram`);

    for (const [labelKey, values] of histogram.entries()) {
      // Calculate bucket counts
      const bucketCounts = this.buckets.map((bucket) => values.filter((v) => v <= bucket).length);
      const infCount = values.length;

      // Emit bucket lines
      for (let i = 0; i < this.buckets.length; i++) {
        lines.push(`${name}_bucket{${labelKey},le="${this.buckets[i]}"} ${bucketCounts[i]}`);
      }
      lines.push(`${name}_bucket{${labelKey},le="+Inf"} ${infCount}`);

      // Emit sum and count
      const sum = values.reduce((a, b) => a + b, 0);
      lines.push(`${name}_sum{${labelKey}} ${sum}`);
      lines.push(`${name}_count{${labelKey}} ${values.length}`);
    }
    lines.push('');
  }
}
