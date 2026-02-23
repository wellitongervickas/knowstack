import { Module } from '@nestjs/common';
import { McpAdminController } from '@/presentation/mcp/mcp-admin.controller';
import { McpAdminToolHandlerService } from '@/application/mcp/services/mcp-admin-tool-handler.service';
import { McpAdminServerFactoryImpl } from '@/infrastructure/mcp/mcp-admin-server.factory';
import { MCP_ADMIN_SERVER_FACTORY } from '@/core/interfaces/mcp/mcp-server.interface';

// Repositories
import { OrganizationRepository } from '@/infrastructure/database/repositories/organization.repository';
import { ORGANIZATION_REPOSITORY } from '@/core/interfaces/repositories/organization.repository.interface';
import { ProjectRepository } from '@/infrastructure/database/repositories/project.repository';
import { PROJECT_REPOSITORY } from '@/core/interfaces/repositories/project.repository.interface';

// Infrastructure
import { DatabaseModule } from '@/infrastructure/database/database.module';

/**
 * MCP Admin Module — organization and project management.
 *
 * Separated from McpModule to avoid ConfigTenantMiddleware.
 * These admin tools operate before tenant context exists.
 */
@Module({
  imports: [DatabaseModule],
  controllers: [McpAdminController],
  providers: [
    McpAdminToolHandlerService,
    { provide: MCP_ADMIN_SERVER_FACTORY, useClass: McpAdminServerFactoryImpl },
    { provide: ORGANIZATION_REPOSITORY, useClass: OrganizationRepository },
    { provide: PROJECT_REPOSITORY, useClass: ProjectRepository },
  ],
})
export class McpAdminModule {}
