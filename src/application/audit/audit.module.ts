import { Module, Global } from '@nestjs/common';
import { ObservabilityModule } from '@/infrastructure/observability/observability.module';
import { AUDIT_LOG_REPOSITORY } from '@/core/interfaces/repositories/audit-log.repository.interface';
import { AUDIT_LOG_SERVICE } from '@/core/interfaces/services/audit-log.interface';
import { AuditLogRepository } from '@/infrastructure/database/repositories/audit-log.repository';
import { AuditLogService } from '@/application/audit/services/audit-log.service';
import { MetadataSanitizer } from '@/application/audit/services/metadata-sanitizer';
import { TenantContextService } from '@/common/services/tenant-context.service';
import { RequestContextService } from '@/common/services/request-context.service';

/**
 * Audit Application Module.
 *
 * Provides audit logging services for event tracking.
 * Marked as @Global() so AuditLogService can be injected anywhere without
 * importing the module.
 */
@Global()
@Module({
  imports: [ObservabilityModule],
  providers: [
    // Context services
    TenantContextService,
    RequestContextService,

    // Metadata sanitizer
    MetadataSanitizer,

    // Repositories
    {
      provide: AUDIT_LOG_REPOSITORY,
      useClass: AuditLogRepository,
    },

    // Audit Log Service
    {
      provide: AUDIT_LOG_SERVICE,
      useClass: AuditLogService,
    },
  ],
  exports: [AUDIT_LOG_SERVICE, AUDIT_LOG_REPOSITORY, MetadataSanitizer],
})
export class AuditModule {}
