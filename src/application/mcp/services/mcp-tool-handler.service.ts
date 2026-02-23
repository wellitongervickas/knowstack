import { Injectable, Inject, Optional } from '@nestjs/common';
import { QueryOrchestratorService } from '@/application/query/services/query-orchestrator.service';
import { DocumentAccessService } from '@/application/documents/services/document-access.service';
import { TenantContextService } from '@/common/services/tenant-context.service';
import { DomainException } from '@/core/exceptions/domain.exception';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
} from '@/core/interfaces/services/observability.interface';
import { McpToolResult } from '@/core/interfaces/mcp/mcp-server.interface';
import { SourceType } from '@/core/entities/document.entity';
import {
  MCP_TOOL_QUERY,
  MCP_TOOL_GET_DOCUMENTS,
  MCP_TOOL_SAVE_DOCUMENTS,
  MCP_TOOL_DELETE_DOCUMENTS,
  MCP_TOOL_GET_AGENTS,
  MCP_TOOL_GET_COMMANDS,
  MCP_TOOL_GET_MEMORY,
  MCP_TOOL_GET_SKILLS,
  MCP_TOOL_SEARCH_INSTRUCTIONS,
  MCP_TOOL_SAVE_MEMORY,
  MCP_TOOL_UPDATE_MEMORY,
  MCP_TOOL_DELETE_MEMORY,
  MCP_TOOL_SAVE_AGENTS,
  MCP_TOOL_SAVE_COMMANDS,
  MCP_TOOL_SAVE_SKILLS,
  MCP_TOOL_GET_TEMPLATES,
  MCP_TOOL_SAVE_TEMPLATES,
  MCP_TOOL_DELETE_TEMPLATES,
  MCP_TOOL_DELETE_AGENTS,
  MCP_TOOL_DELETE_COMMANDS,
  MCP_TOOL_DELETE_SKILLS,
  MCP_TOOL_BACKFILL_INSTRUCTIONS,
  MCP_TOOL_BACKFILL_EMBEDDINGS,
  MCP_ERROR_MESSAGES,
} from '@/application/mcp/mcp.constants';
import { InstructionService } from '@/application/instructions/services/instruction.service';
import {
  DocumentIngestionService,
  DOCUMENT_INGESTION_SERVICE,
} from '@/application/ingestion/services/document-ingestion.service';
import {
  InstructionBackfillService,
  INSTRUCTION_BACKFILL_SERVICE,
} from '@/application/embedding/services/instruction-backfill.service';
import {
  EmbeddingBackfillService,
  EMBEDDING_BACKFILL_SERVICE,
} from '@/application/embedding/services/embedding-backfill.service';
import type { InstructionType, InstructionVisibility } from '@/core/entities/instruction.entity';
import {
  SaveDocumentsValidation,
  SaveInstructionValidation,
} from '@/application/mcp/dto/mcp-tool-schemas';
import { SOURCE_TYPES } from '@/application/ingestion/ingestion.constants';
import { ISourceFetcher, URL_FETCHER } from '@/core/interfaces/services/source-fetcher.interface';
import {
  IAuditLogService,
  AUDIT_LOG_SERVICE,
} from '@/core/interfaces/services/audit-log.interface';
import { AuditAction, AuditCategory, ResourceType } from '@/application/audit/audit.constants';

/** Arguments shared by all instruction save handlers. */
interface SaveInstructionArgs {
  name: string;
  description: string;
  content?: string;
  sourceUrl?: string;
  metadata?: Record<string, unknown>;
  visibility?: string;
}

/**
 * Orchestrates MCP tool execution.
 * No auth checks — tenant context is resolved by ConfigTenantMiddleware.
 * Delegates to application services and returns MCP-formatted results.
 */
@Injectable()
export class McpToolHandlerService {
  constructor(
    private readonly queryOrchestrator: QueryOrchestratorService,
    private readonly documentAccess: DocumentAccessService,
    private readonly instructionService: InstructionService,
    private readonly tenantContext: TenantContextService,
    @Inject(DOCUMENT_INGESTION_SERVICE)
    private readonly ingestionService: DocumentIngestionService,
    @Inject(URL_FETCHER)
    private readonly urlFetcher: ISourceFetcher,
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
    @Optional()
    @Inject(INSTRUCTION_BACKFILL_SERVICE)
    private readonly instructionBackfillService?: InstructionBackfillService,
    @Optional()
    @Inject(EMBEDDING_BACKFILL_SERVICE)
    private readonly embeddingBackfillService?: EmbeddingBackfillService,
    @Optional()
    @Inject(AUDIT_LOG_SERVICE)
    private readonly auditLogService?: IAuditLogService,
  ) {}

  // ─── Query ──────────────────────────────────────────────────────────────────

  async handleQuery(args: { query: string; context?: string }): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    this.logger.info('MCP tool invoked', { tool: MCP_TOOL_QUERY, projectId });

    try {
      const tenant = this.tenantContext.getContext();
      const result = await this.queryOrchestrator.execute(
        { query: args.query, context: args.context },
        tenant,
      );
      this.auditLogService?.log({
        action: AuditAction.QUERY_EXECUTED,
        category: AuditCategory.QUERY,
        resourceType: ResourceType.QUERY,
        projectId,
        metadata: {
          queryLength: args.query.length,
          hasContext: !!args.context,
          sourcesCount: result.sources?.length ?? 0,
          cacheHit: result.meta?.cacheHit ?? false,
        },
      });
      return this.success(result);
    } catch (error) {
      return this.handleError(MCP_TOOL_QUERY, projectId, error);
    }
  }

  // ─── Documents ──────────────────────────────────────────────────────────────

  async handleGetDocuments(args: {
    id?: string;
    q?: string;
    page?: number;
    limit?: number;
    sourceType?: string;
  }): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    this.logger.info('MCP tool invoked', { tool: MCP_TOOL_GET_DOCUMENTS, projectId });

    try {
      const docContextIds = this.tenantContext
        .getContextProjectIdsForType('documents')
        .map((cp) => cp.id);

      // Get by ID
      if (args.id) {
        const result = await this.documentAccess.getDocument(projectId, args.id);
        return this.success(result);
      }

      // Search by query
      if (args.q) {
        const result = await this.documentAccess.searchDocuments(
          projectId,
          { q: args.q, limit: args.limit },
          docContextIds,
        );
        return this.success(result);
      }

      // List all (paginated)
      const result = await this.documentAccess.listDocuments(
        projectId,
        {
          page: args.page,
          limit: args.limit,
          sourceType: args.sourceType as SourceType | undefined,
        },
        docContextIds,
      );
      return this.success(result);
    } catch (error) {
      return this.handleError(MCP_TOOL_GET_DOCUMENTS, projectId, error);
    }
  }

  async handleSaveDocuments(args: {
    title?: string;
    content?: string;
    sourceType?: string;
    sourceUrl?: string;
  }): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    const organizationId = this.tenantContext.getOrganizationId();
    this.logger.info('MCP tool invoked', { tool: MCP_TOOL_SAVE_DOCUMENTS, projectId });

    const validation = SaveDocumentsValidation.safeParse(args);
    if (!validation.success) {
      return this.error(validation.error.issues.map((i) => i.message).join('; '));
    }

    try {
      // URL auto-fetch mode: sourceUrl without content
      if (!args.content && args.sourceUrl) {
        const result = await this.ingestionService.ingestFromSource({
          projectId,
          organizationId,
          sourceType: SOURCE_TYPES.URL,
          sourceUrl: args.sourceUrl,
          title: args.title,
        });
        return this.success(result);
      }

      // Manual mode: content provided directly
      const result = await this.ingestionService.ingest({
        projectId,
        organizationId,
        title: args.title!,
        content: args.content!,
        sourceType: (args.sourceType as SourceType) ?? SOURCE_TYPES.MANUAL,
        sourceUrl: args.sourceUrl,
      });

      return this.success(result);
    } catch (error) {
      return this.handleError(MCP_TOOL_SAVE_DOCUMENTS, projectId, error);
    }
  }

  async handleDeleteDocuments(args: { id: string }): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    const organizationId = this.tenantContext.getOrganizationId();
    this.logger.info('MCP tool invoked', { tool: MCP_TOOL_DELETE_DOCUMENTS, projectId });

    try {
      await this.ingestionService.delete(args.id, projectId, organizationId);
      return this.success({ id: args.id, status: 'deleted' });
    } catch (error) {
      return this.handleError(MCP_TOOL_DELETE_DOCUMENTS, projectId, error);
    }
  }

  // ─── Instructions (get) ─────────────────────────────────────────────────────

  async handleGetAgents(args: { name?: string; visibility?: string }): Promise<McpToolResult> {
    return this.handleGetInstructions('AGENT', MCP_TOOL_GET_AGENTS, args.name, args.visibility);
  }

  async handleGetCommands(args: { name?: string; visibility?: string }): Promise<McpToolResult> {
    return this.handleGetInstructions('COMMAND', MCP_TOOL_GET_COMMANDS, args.name, args.visibility);
  }

  async handleGetMemory(args: { name?: string; visibility?: string }): Promise<McpToolResult> {
    return this.handleGetInstructions('MEMORY', MCP_TOOL_GET_MEMORY, args.name, args.visibility);
  }

  async handleGetSkills(args: { name?: string; visibility?: string }): Promise<McpToolResult> {
    return this.handleGetInstructions('SKILL', MCP_TOOL_GET_SKILLS, args.name, args.visibility);
  }

  async handleGetTemplates(args: { name?: string; visibility?: string }): Promise<McpToolResult> {
    return this.handleGetInstructions(
      'TEMPLATE',
      MCP_TOOL_GET_TEMPLATES,
      args.name,
      args.visibility,
    );
  }

  // ─── Instructions (save) ────────────────────────────────────────────────────

  async handleSaveAgents(args: SaveInstructionArgs): Promise<McpToolResult> {
    return this.handleSaveInstruction('AGENT', MCP_TOOL_SAVE_AGENTS, args);
  }

  async handleSaveCommands(args: SaveInstructionArgs): Promise<McpToolResult> {
    return this.handleSaveInstruction('COMMAND', MCP_TOOL_SAVE_COMMANDS, args);
  }

  async handleSaveSkills(args: SaveInstructionArgs): Promise<McpToolResult> {
    return this.handleSaveInstruction('SKILL', MCP_TOOL_SAVE_SKILLS, args);
  }

  async handleSaveTemplates(args: SaveInstructionArgs): Promise<McpToolResult> {
    return this.handleSaveInstruction('TEMPLATE', MCP_TOOL_SAVE_TEMPLATES, args);
  }

  // ─── Instructions (delete) ──────────────────────────────────────────────────

  async handleDeleteAgents(args: { name: string }): Promise<McpToolResult> {
    return this.handleDeleteInstruction('AGENT', MCP_TOOL_DELETE_AGENTS, args.name);
  }

  async handleDeleteCommands(args: { name: string }): Promise<McpToolResult> {
    return this.handleDeleteInstruction('COMMAND', MCP_TOOL_DELETE_COMMANDS, args.name);
  }

  async handleDeleteSkills(args: { name: string }): Promise<McpToolResult> {
    return this.handleDeleteInstruction('SKILL', MCP_TOOL_DELETE_SKILLS, args.name);
  }

  async handleDeleteTemplates(args: { name: string }): Promise<McpToolResult> {
    return this.handleDeleteInstruction('TEMPLATE', MCP_TOOL_DELETE_TEMPLATES, args.name);
  }

  // ─── Memory ─────────────────────────────────────────────────────────────────

  async handleSaveMemory(args: { name: string; content: string }): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    const organizationId = this.tenantContext.getOrganizationId();
    this.logger.info('MCP tool invoked', { tool: MCP_TOOL_SAVE_MEMORY, projectId });

    try {
      const { instruction, created } = await this.instructionService.upsertMemory(
        projectId,
        organizationId,
        args.name,
        args.content,
      );

      return this.success({
        name: instruction.name,
        content: instruction.content,
        status: created ? 'created' : 'updated',
      });
    } catch (error) {
      return this.handleError(MCP_TOOL_SAVE_MEMORY, projectId, error);
    }
  }

  async handleUpdateMemory(args: {
    name: string;
    old_str: string;
    new_str: string;
  }): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    this.logger.info('MCP tool invoked', { tool: MCP_TOOL_UPDATE_MEMORY, projectId });

    try {
      const instruction = await this.instructionService.replaceMemoryContent(
        projectId,
        args.name,
        args.old_str,
        args.new_str,
      );

      return this.success({
        name: instruction.name,
        content: instruction.content,
        status: 'updated',
      });
    } catch (error) {
      return this.handleError(MCP_TOOL_UPDATE_MEMORY, projectId, error);
    }
  }

  async handleDeleteMemory(args: { name: string }): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    this.logger.info('MCP tool invoked', { tool: MCP_TOOL_DELETE_MEMORY, projectId });

    try {
      await this.instructionService.deleteMemoryByName(projectId, args.name);
      return this.success({ name: args.name, status: 'deleted' });
    } catch (error) {
      return this.handleError(MCP_TOOL_DELETE_MEMORY, projectId, error);
    }
  }

  // ─── Search ─────────────────────────────────────────────────────────────────

  async handleSearchInstructions(args: {
    q: string;
    type?: string;
    limit?: number;
    visibility?: string;
  }): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    const organizationId = this.tenantContext.getOrganizationId();
    this.logger.info('MCP tool invoked', { tool: MCP_TOOL_SEARCH_INSTRUCTIONS, projectId });

    try {
      // Gather context projects across all instruction types for search
      const allContextProjects = [
        ...this.tenantContext.getContextProjectIdsForType('agents'),
        ...this.tenantContext.getContextProjectIdsForType('commands'),
        ...this.tenantContext.getContextProjectIdsForType('skills'),
        ...this.tenantContext.getContextProjectIdsForType('memory'),
        ...this.tenantContext.getContextProjectIdsForType('templates'),
      ];
      // Deduplicate by id
      const seen = new Set<string>();
      const contextProjects = allContextProjects.filter((cp) => {
        if (seen.has(cp.id)) return false;
        seen.add(cp.id);
        return true;
      });

      const result = await this.instructionService.searchMerged(projectId, organizationId, args.q, {
        type: args.type as InstructionType | undefined,
        limit: args.limit,
        visibility: args.visibility as InstructionVisibility | undefined,
        contextProjects,
      });
      this.auditLogService?.log({
        action: AuditAction.SEARCH_EXECUTED,
        category: AuditCategory.QUERY,
        resourceType: ResourceType.INSTRUCTION,
        projectId,
        metadata: {
          queryLength: args.q.length,
          type: args.type,
          resultCount: result.total,
          limit: args.limit,
        },
      });

      return this.success(result);
    } catch (error) {
      return this.handleError(MCP_TOOL_SEARCH_INSTRUCTIONS, projectId, error);
    }
  }

  // ─── Backfill ──────────────────────────────────────────────────────────────

  async handleBackfillInstructions(args: {
    type?: string;
    force?: boolean;
    dryRun?: boolean;
  }): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    const organizationId = this.tenantContext.getOrganizationId();
    this.logger.info('MCP tool invoked', { tool: MCP_TOOL_BACKFILL_INSTRUCTIONS, projectId });

    if (!this.instructionBackfillService) {
      return this.error(
        'Instruction backfill service is not available (embedding module disabled)',
      );
    }

    try {
      const result = await this.instructionBackfillService.backfill({
        projectId,
        organizationId,
        type: args.type as InstructionType | undefined,
        forceRegenerate: args.force,
        dryRun: args.dryRun,
      });

      return this.success(result);
    } catch (error) {
      return this.handleError(MCP_TOOL_BACKFILL_INSTRUCTIONS, projectId, error);
    }
  }

  async handleBackfillEmbeddings(args: {
    force?: boolean;
    dryRun?: boolean;
  }): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    const organizationId = this.tenantContext.getOrganizationId();
    this.logger.info('MCP tool invoked', { tool: MCP_TOOL_BACKFILL_EMBEDDINGS, projectId });

    if (!this.embeddingBackfillService) {
      return this.error('Document backfill service is not available (embedding module disabled)');
    }

    try {
      const result = await this.embeddingBackfillService.backfill(
        {
          projectId,
          forceRegenerate: args.force,
          dryRun: args.dryRun,
        },
        organizationId,
      );

      return this.success(result);
    } catch (error) {
      return this.handleError(MCP_TOOL_BACKFILL_EMBEDDINGS, projectId, error);
    }
  }

  // ─── Shared handlers ────────────────────────────────────────────────────────

  private async handleGetInstructions(
    type: InstructionType,
    toolName: string,
    name?: string,
    visibility?: string,
  ): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    const organizationId = this.tenantContext.getOrganizationId();
    this.logger.info('MCP tool invoked', { tool: toolName, projectId });

    try {
      const contextConfigKey = this.instructionTypeToConfigKey(type);
      const contextProjects = contextConfigKey
        ? this.tenantContext.getContextProjectIdsForType(contextConfigKey)
        : [];

      const instructions = await this.instructionService.findMerged(
        projectId,
        organizationId,
        type,
        {
          name,
          visibility: visibility as InstructionVisibility | undefined,
          contextProjects,
        },
      );

      // When filtering by name: return full content (detail mode)
      // When listing all: return lightweight results (name + description only)
      const result = name
        ? instructions.map((i) => ({
            name: i.name,
            description: i.description,
            content: i.content,
            metadata: i.metadata,
          }))
        : instructions.map((i) => ({
            name: i.name,
            description: i.description,
          }));

      return this.success(result);
    } catch (error) {
      return this.handleError(toolName, projectId, error);
    }
  }

  private async handleSaveInstruction(
    type: InstructionType,
    toolName: string,
    args: SaveInstructionArgs,
  ): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    const organizationId = this.tenantContext.getOrganizationId();
    this.logger.info('MCP tool invoked', { tool: toolName, projectId });

    const validation = SaveInstructionValidation.safeParse(args);
    if (!validation.success) {
      return this.error(validation.error.issues.map((i) => i.message).join('; '));
    }

    try {
      let content = args.content;

      // URL auto-fetch mode: sourceUrl without content
      if (!content && args.sourceUrl) {
        const fetchResult = await this.urlFetcher.fetch(args.sourceUrl);
        if (!fetchResult.success || !fetchResult.document) {
          return this.error(`Failed to fetch content from URL: ${fetchResult.error}`);
        }
        content = fetchResult.document.content;
      }

      const result = await this.instructionService.upsertInstruction(projectId, organizationId, {
        name: args.name,
        type,
        description: args.description,
        content: content!,
        metadata: args.metadata,
        visibility: (args.visibility as InstructionVisibility) ?? 'PRIVATE',
      });

      return this.success({
        name: result.instruction.name,
        type: result.instruction.type,
        status: result.created ? 'created' : result.unchanged ? 'unchanged' : 'updated',
      });
    } catch (error) {
      return this.handleError(toolName, projectId, error);
    }
  }

  private async handleDeleteInstruction(
    type: InstructionType,
    toolName: string,
    name: string,
  ): Promise<McpToolResult> {
    const projectId = this.tenantContext.getProjectId();
    this.logger.info('MCP tool invoked', { tool: toolName, projectId });

    try {
      await this.instructionService.deleteByNameAndType(projectId, name, type);
      return this.success({ name, type, status: 'deleted' });
    } catch (error) {
      return this.handleError(toolName, projectId, error);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private success(data: unknown): McpToolResult {
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  }

  private error(message: string): McpToolResult & { isError: true } {
    return { content: [{ type: 'text', text: message }], isError: true };
  }

  private handleError(tool: string, projectId: string, error: unknown): McpToolResult {
    this.logger.error(`MCP tool ${tool} failed`, error instanceof Error ? error : undefined, {
      projectId,
    } as Record<string, unknown>);

    const message = this.extractErrorMessage(error);
    return this.error(message);
  }

  private extractErrorMessage(error: unknown): string {
    if (error instanceof DomainException) {
      return error.message;
    }
    return MCP_ERROR_MESSAGES.UNEXPECTED_ERROR;
  }

  /**
   * Map InstructionType to context project config key.
   */
  private instructionTypeToConfigKey(
    type: InstructionType,
  ): 'agents' | 'commands' | 'skills' | 'memory' | 'templates' | null {
    switch (type) {
      case 'AGENT':
        return 'agents';
      case 'COMMAND':
        return 'commands';
      case 'SKILL':
        return 'skills';
      case 'MEMORY':
        return 'memory';
      case 'TEMPLATE':
        return 'templates';
      default:
        return null;
    }
  }
}
