import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { McpController } from '@/presentation/mcp/mcp.controller';
import { McpToolHandlerService } from '@/application/mcp/services/mcp-tool-handler.service';
import { McpServerFactoryImpl } from '@/infrastructure/mcp/mcp-server.factory';
import { MCP_SERVER_FACTORY } from '@/core/interfaces/mcp/mcp-server.interface';

// Application services
import { QueryOrchestratorService } from '@/application/query/services/query-orchestrator.service';
import { ContextBuilderService } from '@/application/query/services/context-builder.service';
import { ResponseFormatterService } from '@/application/query/services/response-formatter.service';
import { DocumentAccessService } from '@/application/documents/services/document-access.service';
import { InstructionService } from '@/application/instructions/services/instruction.service';
import { TenantContextService } from '@/common/services/tenant-context.service';
import { ConfigTenantMiddleware } from '@/common/middleware/config-tenant.middleware';

// Repositories
import { DocumentRepository } from '@/infrastructure/database/repositories/document.repository';
import { DOCUMENT_REPOSITORY } from '@/core/interfaces/repositories/document.repository.interface';
import { InstructionRepository } from '@/infrastructure/database/repositories/instruction.repository';
import { INSTRUCTION_REPOSITORY } from '@/core/interfaces/repositories/instruction.repository.interface';
import { OrganizationRepository } from '@/infrastructure/database/repositories/organization.repository';
import { ORGANIZATION_REPOSITORY } from '@/core/interfaces/repositories/organization.repository.interface';
import { ProjectRepository } from '@/infrastructure/database/repositories/project.repository';
import { PROJECT_REPOSITORY } from '@/core/interfaces/repositories/project.repository.interface';

// Infrastructure modules
import { DatabaseModule } from '@/infrastructure/database/database.module';
import { AIModule } from '@/infrastructure/ai/ai.module';
import { EmbeddingModule } from '@/application/embedding/embedding.module';
import { IngestionModule } from '@/infrastructure/ingestion/ingestion.module';
import { aiConfig } from '@/infrastructure/config/ai.config';

/**
 * MCP Module — the sole presentation layer.
 *
 * Provides Model Context Protocol tools via HTTP transport.
 * Replaces all REST endpoints with get/save/delete MCP tools.
 *
 * Context resolution: ConfigTenantMiddleware reads x-ks-org and x-ks-project headers.
 */
@Module({
  imports: [
    ConfigModule.forFeature(aiConfig),
    DatabaseModule,
    AIModule,
    EmbeddingModule,
    IngestionModule,
  ],
  controllers: [McpController],
  providers: [
    // MCP
    McpToolHandlerService,
    { provide: MCP_SERVER_FACTORY, useClass: McpServerFactoryImpl },

    // Application services
    QueryOrchestratorService,
    ContextBuilderService,
    ResponseFormatterService,
    DocumentAccessService,
    InstructionService,
    TenantContextService,
    ConfigTenantMiddleware,

    // Repositories
    { provide: DOCUMENT_REPOSITORY, useClass: DocumentRepository },
    { provide: INSTRUCTION_REPOSITORY, useClass: InstructionRepository },
    { provide: ORGANIZATION_REPOSITORY, useClass: OrganizationRepository },
    { provide: PROJECT_REPOSITORY, useClass: ProjectRepository },
  ],
  exports: [TenantContextService],
})
export class McpModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(ConfigTenantMiddleware).forRoutes(McpController);
  }
}
