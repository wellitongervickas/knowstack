import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogRepository } from '@/infrastructure/database/repositories/audit-log.repository';
import type { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import { AuditCategory } from '@/application/audit/audit.constants';

describe('AuditLogRepository', () => {
  let repository: AuditLogRepository;
  let prismaService: PrismaService;

  const mockAuditLog = {
    id: 'log-1',
    timestamp: new Date('2024-01-01T00:00:00Z'),
    action: 'DOCUMENT_CREATED',
    category: 'DOCUMENT',
    resourceType: 'Document',
    resourceId: 'doc-1',
    organizationId: 'org-1',
    projectId: 'project-1',
    requestId: 'req-1',
    source: 'mcp',
    metadata: { method: 'manual' },
  };

  beforeEach(() => {
    prismaService = {
      auditLog: {
        create: vi.fn().mockResolvedValue(mockAuditLog),
        findMany: vi.fn().mockResolvedValue([mockAuditLog]),
        count: vi.fn().mockResolvedValue(1),
        deleteMany: vi.fn().mockResolvedValue({ count: 5 }),
      },
    } as unknown as PrismaService;

    repository = new AuditLogRepository(prismaService);
  });

  describe('create', () => {
    it('should create an audit log entry', async () => {
      const input = {
        action: 'DOCUMENT_CREATED',
        category: AuditCategory.DOCUMENT,
        resourceType: 'Document',
        resourceId: 'doc-1',
        organizationId: 'org-1',
        projectId: 'project-1',
        requestId: 'req-1',
        source: 'mcp' as const,
        metadata: { method: 'manual' },
      };

      const result = await repository.create(input);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'DOCUMENT_CREATED',
          category: 'DOCUMENT',
        }),
      });

      expect(result).toEqual(
        expect.objectContaining({
          id: 'log-1',
          action: 'DOCUMENT_CREATED',
          category: 'DOCUMENT',
        }),
      );
    });

    it('should handle null values correctly', async () => {
      const input = {
        action: 'ORG_CREATED',
        category: AuditCategory.ADMIN,
      };

      await repository.create(input);

      expect(prismaService.auditLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          resourceType: null,
          resourceId: null,
          organizationId: null,
          projectId: null,
          requestId: null,
          source: null,
        }),
      });
    });
  });

  describe('findByOrganization', () => {
    it('should return paginated results', async () => {
      vi.mocked(prismaService.auditLog.findMany).mockResolvedValue([mockAuditLog]);
      vi.mocked(prismaService.auditLog.count).mockResolvedValue(1);

      const result = await repository.findByOrganization('org-1', {}, { page: 1, limit: 50 });

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 'log-1',
            organizationId: 'org-1',
          }),
        ]),
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should apply filters correctly', async () => {
      await repository.findByOrganization(
        'org-1',
        {
          category: AuditCategory.DOCUMENT,
          from: new Date('2024-01-01'),
          to: new Date('2024-01-31'),
        },
        { page: 1, limit: 50 },
      );

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: 'org-1',
            category: 'DOCUMENT',
            timestamp: {
              gte: new Date('2024-01-01'),
              lte: new Date('2024-01-31'),
            },
          }),
        }),
      );
    });

    it('should calculate pagination correctly', async () => {
      vi.mocked(prismaService.auditLog.count).mockResolvedValue(150);

      const result = await repository.findByOrganization('org-1', {}, { page: 2, limit: 50 });

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 50,
        }),
      );

      expect(result.totalPages).toBe(3);
    });
  });

  describe('countByOrganization', () => {
    it('should return count for organization', async () => {
      vi.mocked(prismaService.auditLog.count).mockResolvedValue(42);

      const result = await repository.countByOrganization('org-1');

      expect(result).toBe(42);
      expect(prismaService.auditLog.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
      });
    });
  });

  describe('deleteOlderThan', () => {
    it('should delete old records in batches', async () => {
      const oldLogs = [{ id: 'log-1' }, { id: 'log-2' }, { id: 'log-3' }];
      vi.mocked(prismaService.auditLog.findMany).mockResolvedValue(
        oldLogs as unknown as Awaited<ReturnType<typeof prismaService.auditLog.findMany>>,
      );
      vi.mocked(prismaService.auditLog.deleteMany).mockResolvedValue({ count: 3 });

      const cutoffDate = new Date('2024-01-01');
      const result = await repository.deleteOlderThan(cutoffDate, 1000);

      expect(prismaService.auditLog.findMany).toHaveBeenCalledWith({
        where: { timestamp: { lt: cutoffDate } },
        select: { id: true },
        take: 1000,
      });

      expect(prismaService.auditLog.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['log-1', 'log-2', 'log-3'] } },
      });

      expect(result).toEqual({ count: 3 });
    });

    it('should return zero count when no records to delete', async () => {
      vi.mocked(prismaService.auditLog.findMany).mockResolvedValue([]);

      const result = await repository.deleteOlderThan(new Date(), 1000);

      expect(result).toEqual({ count: 0 });
      expect(prismaService.auditLog.deleteMany).not.toHaveBeenCalled();
    });
  });
});
