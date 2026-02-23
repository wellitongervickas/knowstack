import { describe, it, expect, beforeEach } from 'vitest';
import { MetricsService } from '@/infrastructure/observability/services/metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  describe('incrementQueryTotal', () => {
    it('should increment counter for given labels', () => {
      service.incrementQueryTotal({ provider: 'openai', source: 'api' });
      service.incrementQueryTotal({ provider: 'openai', source: 'api' });
      service.incrementQueryTotal({ provider: 'openai', source: 'mcp' });

      const metrics = service.getMetrics();

      expect(metrics).toContain('knowstack_queries_total{provider="openai",source="api"} 2');
      expect(metrics).toContain('knowstack_queries_total{provider="openai",source="mcp"} 1');
    });
  });

  describe('incrementQueryErrors', () => {
    it('should increment error counter', () => {
      service.incrementQueryErrors({ provider: 'openai', source: 'api' });

      const metrics = service.getMetrics();

      expect(metrics).toContain('knowstack_query_errors_total{provider="openai",source="api"} 1');
    });
  });

  describe('recordQueryLatency', () => {
    it('should record latency in histogram buckets', () => {
      service.recordQueryLatency(50, { provider: 'openai', source: 'api' });
      service.recordQueryLatency(150, { provider: 'openai', source: 'api' });
      service.recordQueryLatency(600, { provider: 'openai', source: 'api' });

      const metrics = service.getMetrics();

      // 50ms falls in le="50" and above
      expect(metrics).toContain(
        'knowstack_query_latency_ms_bucket{provider="openai",source="api",le="50"} 1',
      );
      // 150ms falls in le="250" and above
      expect(metrics).toContain(
        'knowstack_query_latency_ms_bucket{provider="openai",source="api",le="250"} 2',
      );
      // All 3 in +Inf
      expect(metrics).toContain(
        'knowstack_query_latency_ms_bucket{provider="openai",source="api",le="+Inf"} 3',
      );
      // Sum and count
      expect(metrics).toContain(
        'knowstack_query_latency_ms_sum{provider="openai",source="api"} 800',
      );
      expect(metrics).toContain(
        'knowstack_query_latency_ms_count{provider="openai",source="api"} 3',
      );
    });
  });

  describe('incrementAuditLogWrites', () => {
    it('should increment audit log writes counter for given category', () => {
      service.incrementAuditLogWrites({ category: 'AUTH' });
      service.incrementAuditLogWrites({ category: 'AUTH' });
      service.incrementAuditLogWrites({ category: 'DOCUMENT' });

      const metrics = service.getMetrics();

      expect(metrics).toContain('knowstack_audit_log_writes_total{category="AUTH"} 2');
      expect(metrics).toContain('knowstack_audit_log_writes_total{category="DOCUMENT"} 1');
    });
  });

  describe('incrementAuditLogWriteFailures', () => {
    it('should increment audit log write failures counter', () => {
      service.incrementAuditLogWriteFailures({ category: 'USER' });
      service.incrementAuditLogWriteFailures({ category: 'USER' });

      const metrics = service.getMetrics();

      expect(metrics).toContain('knowstack_audit_log_write_failures_total{category="USER"} 2');
    });
  });

  describe('recordAuditLogCleanup', () => {
    it('should increment cleanup deleted count without labels', () => {
      service.recordAuditLogCleanup(150);
      service.recordAuditLogCleanup(250);

      const metrics = service.getMetrics();

      expect(metrics).toContain('knowstack_audit_log_cleanup_deleted_count{} 400');
    });
  });

  describe('getMetrics', () => {
    it('should return Prometheus format with HELP and TYPE', () => {
      service.incrementQueryTotal({ provider: 'stub', source: 'api' });

      const metrics = service.getMetrics();

      expect(metrics).toContain('# HELP knowstack_queries_total');
      expect(metrics).toContain('# TYPE knowstack_queries_total counter');
    });

    it('should include audit log metrics in output', () => {
      service.incrementAuditLogWrites({ category: 'AUTH' });
      service.incrementAuditLogWriteFailures({ category: 'DOCUMENT' });
      service.recordAuditLogCleanup(100);

      const metrics = service.getMetrics();

      expect(metrics).toContain('# HELP knowstack_audit_log_writes_total');
      expect(metrics).toContain('# TYPE knowstack_audit_log_writes_total counter');
      expect(metrics).toContain('# HELP knowstack_audit_log_write_failures_total');
      expect(metrics).toContain('# TYPE knowstack_audit_log_write_failures_total counter');
      expect(metrics).toContain('# HELP knowstack_audit_log_cleanup_deleted_count');
      expect(metrics).toContain('# TYPE knowstack_audit_log_cleanup_deleted_count counter');
    });

    it('should return empty string when no metrics recorded', () => {
      const metrics = service.getMetrics();

      expect(metrics).toBe('');
    });
  });
});
