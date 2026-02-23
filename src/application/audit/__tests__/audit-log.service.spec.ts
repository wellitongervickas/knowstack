import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { AuditLogService } from '@/application/audit/services/audit-log.service';
import { MetadataSanitizer } from '@/application/audit/services/metadata-sanitizer';
import type { IAuditLogRepository } from '@/core/interfaces/repositories/audit-log.repository.interface';
import type {
  IStructuredLogger,
  IMetricsService,
} from '@/core/interfaces/services/observability.interface';
import type { TenantContextService } from '@/common/services/tenant-context.service';
import type { RequestContextService } from '@/common/services/request-context.service';
import { AuditAction, AuditCategory } from '@/application/audit/audit.constants';
import { flushPromises } from '@/tests/utils';

// Mock app.settings module
vi.mock('@/app.settings', () => ({
  AUDIT_LOG_ENABLED: true,
  AUDIT_LOG_RETENTION_DAYS: 365,
  AUDIT_LOG_CLEANUP_INTERVAL_MS: 86400000,
  AUDIT_LOG_BATCH_DELETE_SIZE: 1000,
}));

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: IAuditLogRepository;
  let logger: IStructuredLogger;
  let metrics: IMetricsService;
  let tenantContext: TenantContextService;
  let requestContext: RequestContextService;
  let metadataSanitizer: MetadataSanitizer;

  const mockAuditLog = {
    id: 'log-1',
    timestamp: new Date(),
    action: AuditAction.DOCUMENT_CREATED,
    category: 'DOCUMENT' as const,
    resourceType: 'Document',
    resourceId: 'doc-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    requestId: 'req-1',
    source: 'mcp' as const,
    metadata: {},
  };

  beforeEach(() => {
    // Mock Repository
    repository = {
      create: vi.fn().mockResolvedValue(mockAuditLog),
      findByOrganization: vi.fn(),
      countByOrganization: vi.fn(),
      deleteOlderThan: vi.fn().mockResolvedValue({ count: 0 }),
    } as unknown as IAuditLogRepository;

    // Mock Logger
    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as IStructuredLogger;

    // Mock Metrics Service
    metrics = {
      incrementAuditLogWrites: vi.fn(),
      incrementAuditLogWriteFailures: vi.fn(),
      recordAuditLogCleanup: vi.fn(),
      incrementAuditLogCleanupFailures: vi.fn(),
      recordAuditLogWriteDuration: vi.fn(),
      recordAuditLogQueryDuration: vi.fn(),
    } as unknown as IMetricsService;

    // Mock TenantContextService
    tenantContext = {
      getContextOrNull: vi.fn().mockReturnValue({
        organization: { id: 'org-1', slug: 'test-org' },
        project: { id: 'project-1', slug: 'test-project' },
      }),
    } as unknown as TenantContextService;

    // Mock RequestContextService
    requestContext = {
      getContextOrNull: vi.fn().mockReturnValue({
        requestId: 'req-1',
        source: 'mcp',
        startTime: Date.now(),
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      }),
    } as unknown as RequestContextService;

    // Real MetadataSanitizer
    metadataSanitizer = new MetadataSanitizer();

    service = new AuditLogService(
      repository,
      logger,
      metrics,
      tenantContext,
      requestContext,
      metadataSanitizer,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.clearAllMocks();
  });

  describe('isEnabled', () => {
    it('should return true when AUDIT_LOG_ENABLED is true', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('log', () => {
    it('should create audit log entry when enabled', async () => {
      const event = {
        action: AuditAction.DOCUMENT_CREATED,
        category: AuditCategory.DOCUMENT,
        resourceType: 'Document',
        resourceId: 'doc-1',
      };

      service.log(event);

      await flushPromises();

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.DOCUMENT_CREATED,
          category: AuditCategory.DOCUMENT,
          resourceType: 'Document',
          resourceId: 'doc-1',
        }),
      );
    });

    it('should enrich from tenant context when fields not provided', async () => {
      const event = {
        action: AuditAction.DOCUMENT_CREATED,
        category: AuditCategory.DOCUMENT,
      };

      service.log(event);

      await flushPromises();

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-1',
          projectId: 'project-1',
        }),
      );
    });

    it('should enrich from request context when fields not provided', async () => {
      const event = {
        action: AuditAction.DOCUMENT_CREATED,
        category: AuditCategory.DOCUMENT,
      };

      service.log(event);

      await flushPromises();

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          requestId: 'req-1',
        }),
      );
    });

    it('should use explicit values over context values', async () => {
      const event = {
        action: AuditAction.DOCUMENT_CREATED,
        category: AuditCategory.DOCUMENT,
        organizationId: 'explicit-org',
      };

      service.log(event);

      await flushPromises();

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'explicit-org',
        }),
      );
    });

    it('should handle null context gracefully', async () => {
      vi.mocked(tenantContext.getContextOrNull).mockReturnValue(null);
      vi.mocked(requestContext.getContextOrNull).mockReturnValue(null);

      const event = {
        action: AuditAction.DOCUMENT_CREATED,
        category: AuditCategory.DOCUMENT,
      };

      service.log(event);

      await flushPromises();

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: null,
          projectId: null,
          requestId: null,
          source: null,
        }),
      );
    });

    it('should sanitize metadata before storage', async () => {
      const event = {
        action: AuditAction.DOCUMENT_CREATED,
        category: AuditCategory.DOCUMENT,
        metadata: {
          method: 'manual',
          password: 'secret123',
          token: 'jwt-token',
        },
      };

      service.log(event);

      await flushPromises();

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: {
            method: 'manual',
          },
        }),
      );
    });

    it('should not throw on repository error (fire-and-forget)', async () => {
      vi.mocked(repository.create).mockRejectedValue(new Error('DB error'));

      const event = {
        action: AuditAction.DOCUMENT_CREATED,
        category: AuditCategory.DOCUMENT,
      };

      expect(() => service.log(event)).not.toThrow();

      await flushPromises();

      expect(logger.error).toHaveBeenCalledWith(
        'Audit log write failed',
        expect.any(Error),
        expect.any(Object),
      );
    });
  });

  describe('metrics instrumentation', () => {
    it('should increment audit_log_writes_total on successful write', async () => {
      const event = {
        action: AuditAction.DOCUMENT_CREATED,
        category: AuditCategory.DOCUMENT,
        resourceType: 'Document',
        resourceId: 'doc-1',
      };

      service.log(event);

      await flushPromises();

      expect(metrics.incrementAuditLogWrites).toHaveBeenCalledWith({
        category: AuditCategory.DOCUMENT,
      });
    });

    it('should increment audit_log_write_failures_total on repository error', async () => {
      vi.mocked(repository.create).mockRejectedValue(new Error('DB error'));

      const event = {
        action: AuditAction.DOCUMENT_DELETED,
        category: AuditCategory.DOCUMENT,
      };

      service.log(event);

      await flushPromises();

      expect(metrics.incrementAuditLogWriteFailures).toHaveBeenCalledWith({
        category: AuditCategory.DOCUMENT,
      });
    });

    it('should not increment write failures on success', async () => {
      const event = {
        action: AuditAction.DOCUMENT_CREATED,
        category: AuditCategory.DOCUMENT,
      };

      service.log(event);

      await flushPromises();

      expect(metrics.incrementAuditLogWriteFailures).not.toHaveBeenCalled();
    });

    it('should record cleanup metrics when logs are deleted', async () => {
      vi.mocked(repository.deleteOlderThan).mockResolvedValue({ count: 150 });

      service.onModuleInit();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).runCleanup();

      expect(metrics.recordAuditLogCleanup).toHaveBeenCalledWith(150);
    });

    it('should not record cleanup metrics when no logs deleted', async () => {
      vi.mocked(repository.deleteOlderThan).mockResolvedValue({ count: 0 });

      service.onModuleInit();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).runCleanup();

      expect(metrics.recordAuditLogCleanup).not.toHaveBeenCalled();
    });

    it('should record total cleanup count across batches', async () => {
      vi.mocked(repository.deleteOlderThan)
        .mockResolvedValueOnce({ count: 1000 })
        .mockResolvedValueOnce({ count: 1000 })
        .mockResolvedValueOnce({ count: 500 });

      service.onModuleInit();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (service as any).runCleanup();

      expect(metrics.recordAuditLogCleanup).toHaveBeenCalledWith(2500);
    });

    it('should include correct category label for different audit categories', async () => {
      const testCases = [
        { category: AuditCategory.DOCUMENT, action: AuditAction.DOCUMENT_CREATED },
        { category: AuditCategory.ADMIN, action: AuditAction.ORG_CREATED },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();

        service.log({
          action: testCase.action,
          category: testCase.category,
        });

        await flushPromises();

        expect(metrics.incrementAuditLogWrites).toHaveBeenCalledWith({
          category: testCase.category,
        });
      }
    });
  });

  describe('onModuleInit', () => {
    it('should start cleanup interval when enabled', () => {
      const setIntervalSpy = vi.spyOn(global, 'setInterval');

      service.onModuleInit();

      expect(setIntervalSpy).toHaveBeenCalled();

      setIntervalSpy.mockRestore();
    });
  });

  describe('onModuleDestroy', () => {
    it('should clear cleanup interval', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      service.onModuleInit();
      service.onModuleDestroy();

      expect(clearIntervalSpy).toHaveBeenCalled();

      clearIntervalSpy.mockRestore();
    });
  });
});

describe('AuditLogService (disabled)', () => {
  let service: AuditLogService;
  let repository: IAuditLogRepository;
  let logger: IStructuredLogger;
  let metrics: IMetricsService;
  let tenantContext: TenantContextService;
  let requestContext: RequestContextService;
  let metadataSanitizer: MetadataSanitizer;

  beforeEach(async () => {
    vi.resetModules();
    vi.doMock('@/app.settings', () => ({
      AUDIT_LOG_ENABLED: false,
      AUDIT_LOG_RETENTION_DAYS: 365,
      AUDIT_LOG_CLEANUP_INTERVAL_MS: 86400000,
      AUDIT_LOG_BATCH_DELETE_SIZE: 1000,
    }));

    const { AuditLogService: AuditLogServiceClass } =
      await import('@/application/audit/services/audit-log.service');
    const { MetadataSanitizer: MetadataSanitizerClass } =
      await import('@/application/audit/services/metadata-sanitizer');

    repository = {
      create: vi.fn(),
      findByOrganization: vi.fn(),
      countByOrganization: vi.fn(),
      deleteOlderThan: vi.fn().mockResolvedValue({ count: 0 }),
    } as unknown as IAuditLogRepository;

    logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    } as unknown as IStructuredLogger;

    metrics = {
      incrementAuditLogWrites: vi.fn(),
      incrementAuditLogWriteFailures: vi.fn(),
      recordAuditLogCleanup: vi.fn(),
      incrementAuditLogCleanupFailures: vi.fn(),
      recordAuditLogWriteDuration: vi.fn(),
      recordAuditLogQueryDuration: vi.fn(),
    } as unknown as IMetricsService;

    tenantContext = {
      getContextOrNull: vi.fn().mockReturnValue(null),
    } as unknown as TenantContextService;

    requestContext = {
      getContextOrNull: vi.fn().mockReturnValue(null),
    } as unknown as RequestContextService;

    metadataSanitizer = new MetadataSanitizerClass();

    service = new AuditLogServiceClass(
      repository,
      logger,
      metrics,
      tenantContext,
      requestContext,
      metadataSanitizer,
    );
  });

  afterEach(() => {
    service.onModuleDestroy();
    vi.clearAllMocks();
  });

  it('should return false when AUDIT_LOG_ENABLED is false', () => {
    expect(service.isEnabled()).toBe(false);
  });

  it('should not create audit log when disabled', async () => {
    service.log({
      action: AuditAction.DOCUMENT_CREATED,
      category: AuditCategory.DOCUMENT,
    });

    await flushPromises();

    expect(repository.create).not.toHaveBeenCalled();
  });

  it('should not start cleanup interval when disabled', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');

    service.onModuleInit();

    expect(setIntervalSpy).not.toHaveBeenCalled();

    setIntervalSpy.mockRestore();
  });
});
