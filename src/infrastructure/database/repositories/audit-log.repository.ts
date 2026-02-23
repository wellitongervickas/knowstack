import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import {
  IAuditLogRepository,
  CreateAuditLogInput,
  AuditLogQueryFilters,
  AuditLogPagination,
  AuditLogPaginatedResult,
  DeleteResult,
} from '@/core/interfaces/repositories/audit-log.repository.interface';
import { AuditLog } from '@/core/entities/audit-log.entity';

/**
 * Prisma implementation of the audit log repository.
 * Provides persistence for immutable audit log entries.
 */
@Injectable()
export class AuditLogRepository implements IAuditLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        action: input.action,
        category: input.category,
        resourceType: input.resourceType ?? null,
        resourceId: input.resourceId ?? null,
        organizationId: input.organizationId ?? null,
        projectId: input.projectId ?? null,
        requestId: input.requestId ?? null,
        source: input.source ?? null,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });

    return this.mapToEntity(auditLog);
  }

  async findByOrganization(
    organizationId: string,
    filters: AuditLogQueryFilters,
    pagination: AuditLogPagination,
  ): Promise<AuditLogPaginatedResult> {
    const where = this.buildWhereClause({ ...filters, organizationId });
    const skip = (pagination.page - 1) * pagination.limit;

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: pagination.limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map((record) => this.mapToEntity(record)),
      total,
      page: pagination.page,
      limit: pagination.limit,
      totalPages: Math.ceil(total / pagination.limit),
    };
  }

  async countByOrganization(organizationId: string): Promise<number> {
    return this.prisma.auditLog.count({
      where: { organizationId },
    });
  }

  async deleteOlderThan(cutoffDate: Date, batchSize: number): Promise<DeleteResult> {
    const toDelete = await this.prisma.auditLog.findMany({
      where: { timestamp: { lt: cutoffDate } },
      select: { id: true },
      take: batchSize,
    });

    if (toDelete.length === 0) {
      return { count: 0 };
    }

    const result = await this.prisma.auditLog.deleteMany({
      where: { id: { in: toDelete.map((r) => r.id) } },
    });

    return { count: result.count };
  }

  /**
   * Build Prisma where clause from filters.
   */
  private buildWhereClause(filters: AuditLogQueryFilters): Prisma.AuditLogWhereInput {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.organizationId) {
      where.organizationId = filters.organizationId;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.action) {
      where.action = filters.action;
    }

    if (filters.resourceType) {
      where.resourceType = filters.resourceType;
    }

    if (filters.resourceId) {
      where.resourceId = filters.resourceId;
    }

    if (filters.from || filters.to) {
      where.timestamp = {};
      if (filters.from) {
        where.timestamp.gte = filters.from;
      }
      if (filters.to) {
        where.timestamp.lte = filters.to;
      }
    }

    return where;
  }

  /**
   * Map Prisma audit log to domain entity.
   */
  private mapToEntity(
    record: Awaited<ReturnType<typeof this.prisma.auditLog.findFirst>> & NonNullable<unknown>,
  ): AuditLog {
    return {
      id: record.id,
      timestamp: record.timestamp,
      action: record.action,
      category: record.category as AuditLog['category'],
      resourceType: record.resourceType,
      resourceId: record.resourceId,
      organizationId: record.organizationId,
      projectId: record.projectId,
      requestId: record.requestId,
      source: record.source as AuditLog['source'],
      metadata: (record.metadata as AuditLog['metadata']) ?? {},
    };
  }
}
