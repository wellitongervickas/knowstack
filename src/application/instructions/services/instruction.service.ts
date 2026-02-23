import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import {
  IInstructionRepository,
  INSTRUCTION_REPOSITORY,
} from '@/core/interfaces/repositories/instruction.repository.interface';
import {
  Instruction,
  InstructionType,
  InstructionVisibility,
} from '@/core/entities/instruction.entity';
import {
  InstructionNotFoundException,
  InstructionDuplicateException,
  MemoryEntryNotFoundException,
  MemoryContentReplaceException,
} from '@/core/exceptions/instruction.exception';
import { CreateInstructionDto } from '@/application/instructions/dto/create-instruction.dto';
import { UpdateInstructionDto } from '@/application/instructions/dto/update-instruction.dto';
import { InstructionListQueryDto } from '@/application/instructions/dto/instruction-query.dto';
import {
  PaginatedInstructionListResponseDto,
  mapInstructionToResponse,
} from '@/application/instructions/dto/instruction-response.dto';
import {
  INSTRUCTION_DEFAULTS,
  INSTRUCTION_SEARCH_WEIGHTS,
  INSTRUCTION_TYPES,
  MEMORY_DEFAULT_DESCRIPTION,
} from '@/application/instructions/instructions.constants';
import { scoreByKeywords } from '@/common/utils/keyword-scoring.util';
import type {
  InstructionSearchResultDto,
  InstructionSearchResponseDto,
} from '@/application/instructions/dto/instruction-search-response.dto';
import {
  InstructionEmbeddingService,
  INSTRUCTION_EMBEDDING_SERVICE,
} from '@/application/embedding/services/instruction-embedding.service';
import {
  InstructionSearchService,
  INSTRUCTION_SEARCH_SERVICE,
} from '@/application/embedding/services/instruction-search.service';
import {
  IAuditLogService,
  AUDIT_LOG_SERVICE,
} from '@/core/interfaces/services/audit-log.interface';
import { AuditAction, AuditCategory, ResourceType } from '@/application/audit/audit.constants';

@Injectable()
export class InstructionService {
  private readonly logger = new Logger(InstructionService.name);

  constructor(
    @Inject(INSTRUCTION_REPOSITORY)
    private readonly instructionRepository: IInstructionRepository,
    @Optional()
    @Inject(INSTRUCTION_EMBEDDING_SERVICE)
    private readonly embeddingService?: InstructionEmbeddingService,
    @Optional()
    @Inject(INSTRUCTION_SEARCH_SERVICE)
    private readonly searchService?: InstructionSearchService,
    @Optional()
    @Inject(AUDIT_LOG_SERVICE)
    private readonly auditLogService?: IAuditLogService,
  ) {}

  /**
   * Create an instruction scoped to a project (PRIVATE) or organization (ORGANIZATION).
   */
  async create(
    projectId: string,
    organizationId: string,
    dto: CreateInstructionDto,
  ): Promise<Instruction> {
    const visibility = dto.visibility ?? 'PRIVATE';

    if (visibility === 'ORGANIZATION') {
      const existing = await this.instructionRepository.findByNameAndTypeForOrganization(
        dto.name,
        dto.type,
        organizationId,
      );
      if (existing) {
        throw new InstructionDuplicateException();
      }

      const orgInstruction = await this.instructionRepository.create({
        name: dto.name,
        type: dto.type,
        visibility: 'ORGANIZATION',
        description: dto.description,
        content: dto.content,
        metadata: dto.metadata,
        projectId: null,
        organizationId,
      });
      this.triggerEmbedding(orgInstruction);
      this.logAudit(
        AuditAction.INSTRUCTION_CREATED,
        orgInstruction.id,
        {
          name: dto.name,
          type: dto.type,
          visibility: 'ORGANIZATION',
        },
        null,
        organizationId,
      );
      return orgInstruction;
    }

    // PRIVATE (default)
    const existing = await this.instructionRepository.findByNameAndType(
      dto.name,
      dto.type,
      projectId,
    );
    if (existing) {
      throw new InstructionDuplicateException();
    }

    const created = await this.instructionRepository.create({
      name: dto.name,
      type: dto.type,
      visibility: 'PRIVATE',
      description: dto.description,
      content: dto.content,
      metadata: dto.metadata,
      projectId,
      organizationId,
    });
    this.triggerEmbedding(created);
    this.logAudit(
      AuditAction.INSTRUCTION_CREATED,
      created.id,
      {
        name: dto.name,
        type: dto.type,
        visibility: 'PRIVATE',
      },
      projectId,
      organizationId,
    );
    return created;
  }

  /**
   * List instructions for a project with optional type filter and pagination.
   */
  async findByProjectId(
    projectId: string,
    query: InstructionListQueryDto,
  ): Promise<PaginatedInstructionListResponseDto> {
    let instructions: Instruction[];

    if (query.type) {
      instructions = await this.instructionRepository.findByProjectIdAndType(projectId, query.type);
    } else {
      instructions = await this.instructionRepository.findByProjectId(projectId);
    }

    // Sort by createdAt descending
    instructions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // In-memory pagination
    const page = query.page ?? 1;
    const limit = query.limit ?? INSTRUCTION_DEFAULTS.LIST_PAGE_SIZE;
    const total = instructions.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = instructions.slice(offset, offset + limit);

    return {
      data: paginated.map(mapInstructionToResponse),
      pagination: { total, page, limit, totalPages },
    };
  }

  /**
   * Find a single instruction by ID, enforcing tenant isolation.
   * PRIVATE: must match projectId. ORGANIZATION: must match organizationId. PUBLIC: visible to all.
   */
  async findById(projectId: string, organizationId: string, id: string): Promise<Instruction> {
    const instruction = await this.instructionRepository.findById(id);

    if (!instruction || !this.canAccessInstruction(instruction, projectId, organizationId)) {
      throw new InstructionNotFoundException();
    }

    return instruction;
  }

  /**
   * Partial update an instruction, enforcing tenant isolation.
   */
  async update(
    projectId: string,
    organizationId: string,
    id: string,
    dto: UpdateInstructionDto,
  ): Promise<Instruction> {
    const instruction = await this.instructionRepository.findById(id);

    if (!instruction || !this.canAccessInstruction(instruction, projectId, organizationId)) {
      throw new InstructionNotFoundException();
    }

    // Check for duplicate name if name is being changed
    if (dto.name && dto.name !== instruction.name) {
      if (instruction.visibility === 'ORGANIZATION') {
        const existing = await this.instructionRepository.findByNameAndTypeForOrganization(
          dto.name,
          instruction.type,
          organizationId,
        );
        if (existing) {
          throw new InstructionDuplicateException();
        }
      } else {
        const existing = await this.instructionRepository.findByNameAndType(
          dto.name,
          instruction.type,
          instruction.projectId,
        );
        if (existing) {
          throw new InstructionDuplicateException();
        }
      }
    }

    const updated = await this.instructionRepository.update(id, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.content !== undefined && { content: dto.content }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
    });
    this.triggerEmbedding(updated);
    this.logAudit(
      AuditAction.INSTRUCTION_UPDATED,
      updated.id,
      {
        name: updated.name,
        type: updated.type,
        visibility: updated.visibility,
        fieldsChanged: Object.keys(dto).filter(
          (k) => dto[k as keyof UpdateInstructionDto] !== undefined,
        ),
      },
      updated.projectId,
      organizationId,
    );
    return updated;
  }

  /**
   * Delete an instruction, enforcing tenant isolation.
   */
  async delete(projectId: string, organizationId: string, id: string): Promise<void> {
    const instruction = await this.instructionRepository.findById(id);

    if (!instruction || !this.canAccessInstruction(instruction, projectId, organizationId)) {
      throw new InstructionNotFoundException();
    }

    await this.instructionRepository.delete(id);
    this.triggerEmbeddingDelete(id);
    this.logAudit(
      AuditAction.INSTRUCTION_DELETED,
      instruction.id,
      {
        name: instruction.name,
        type: instruction.type,
        visibility: instruction.visibility,
      },
      instruction.projectId,
      organizationId,
    );
  }

  /**
   * Create or update an instruction by name and type (upsert semantics).
   * If an instruction with the same name+type exists in the project, updates it.
   * Otherwise creates a new one.
   */
  async upsertInstruction(
    projectId: string,
    organizationId: string,
    dto: {
      name: string;
      type: InstructionType;
      description: string;
      content: string;
      metadata?: Record<string, unknown>;
      visibility?: InstructionVisibility;
    },
  ): Promise<{ instruction: Instruction; created: boolean; unchanged?: boolean }> {
    const visibility = dto.visibility ?? 'PRIVATE';

    const existing =
      visibility === 'ORGANIZATION'
        ? await this.instructionRepository.findByNameAndTypeForOrganization(
            dto.name,
            dto.type,
            organizationId,
          )
        : await this.instructionRepository.findByNameAndType(dto.name, dto.type, projectId);

    if (existing) {
      const normalizeMetadata = (m: unknown): string =>
        JSON.stringify(
          m === undefined ||
            m === null ||
            (typeof m === 'object' && Object.keys(m as object).length === 0)
            ? null
            : m,
        );
      const unchanged =
        existing.description === dto.description &&
        existing.content === dto.content &&
        normalizeMetadata(existing.metadata) === normalizeMetadata(dto.metadata);

      if (unchanged) {
        return { instruction: existing, created: false, unchanged: true };
      }

      const updated = await this.instructionRepository.update(existing.id, {
        description: dto.description,
        content: dto.content,
        metadata: dto.metadata,
      });
      this.triggerEmbedding(updated);
      this.logAudit(AuditAction.INSTRUCTION_UPDATED, updated.id, {
        name: updated.name,
        type: updated.type,
        visibility: updated.visibility,
      });
      return { instruction: updated, created: false, unchanged: false };
    }

    const created = await this.instructionRepository.create({
      name: dto.name,
      type: dto.type,
      visibility,
      description: dto.description,
      content: dto.content,
      metadata: dto.metadata,
      projectId: visibility === 'ORGANIZATION' ? null : projectId,
      organizationId,
    });
    this.triggerEmbedding(created);
    this.logAudit(AuditAction.INSTRUCTION_CREATED, created.id, {
      name: created.name,
      type: created.type,
      visibility: created.visibility,
    });

    return { instruction: created, created: true };
  }

  /**
   * Delete an instruction by name and type within a project.
   */
  async deleteByNameAndType(projectId: string, name: string, type: InstructionType): Promise<void> {
    const existing = await this.instructionRepository.findByNameAndType(name, type, projectId);

    if (!existing) {
      throw new InstructionNotFoundException();
    }

    await this.instructionRepository.delete(existing.id);
    this.triggerEmbeddingDelete(existing.id);
    this.logAudit(
      AuditAction.INSTRUCTION_DELETED,
      existing.id,
      {
        name,
        type,
        visibility: existing.visibility,
      },
      projectId,
      existing.organizationId,
    );
  }

  /**
   * Create or update a PRIVATE MEMORY entry by name within a project.
   * If an entry with the same name exists, updates its content.
   * If not, creates a new one with type=MEMORY, visibility=PRIVATE.
   */
  async upsertMemory(
    projectId: string,
    organizationId: string,
    name: string,
    content: string,
  ): Promise<{ instruction: Instruction; created: boolean }> {
    const existing = await this.instructionRepository.findByNameAndType(name, 'MEMORY', projectId);

    if (existing) {
      const updated = await this.instructionRepository.update(existing.id, { content });
      this.triggerEmbedding(updated);
      this.logAudit(
        AuditAction.INSTRUCTION_UPDATED,
        updated.id,
        {
          name,
          type: 'MEMORY',
        },
        projectId,
        organizationId,
      );
      return { instruction: updated, created: false };
    }

    const created = await this.instructionRepository.create({
      name,
      type: 'MEMORY',
      visibility: 'PRIVATE',
      description: MEMORY_DEFAULT_DESCRIPTION,
      content,
      projectId,
      organizationId,
    });
    this.triggerEmbedding(created);
    this.logAudit(
      AuditAction.INSTRUCTION_CREATED,
      created.id,
      {
        name,
        type: 'MEMORY',
      },
      projectId,
      organizationId,
    );

    return { instruction: created, created: true };
  }

  /**
   * Replace a substring in a MEMORY entry's content (str_replace semantics).
   * The old_str must match exactly once for safe replacement.
   */
  async replaceMemoryContent(
    projectId: string,
    name: string,
    oldStr: string,
    newStr: string,
  ): Promise<Instruction> {
    const existing = await this.instructionRepository.findByNameAndType(name, 'MEMORY', projectId);

    if (!existing) {
      throw new MemoryEntryNotFoundException(name);
    }

    const escapedOldStr = oldStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = existing.content.match(new RegExp(escapedOldStr, 'g'));
    const matchCount = matches?.length ?? 0;

    if (matchCount === 0) {
      throw new MemoryContentReplaceException(`old_str not found in memory entry '${name}'`);
    }

    if (matchCount > 1) {
      throw new MemoryContentReplaceException(
        `old_str matches ${matchCount} times in memory entry '${name}', must be unique for safe replacement`,
      );
    }

    const newContent = existing.content.replace(oldStr, newStr);
    const updated = await this.instructionRepository.update(existing.id, { content: newContent });
    this.triggerEmbedding(updated);
    this.logAudit(
      AuditAction.INSTRUCTION_UPDATED,
      updated.id,
      {
        name,
        type: 'MEMORY',
        operation: 'str_replace',
      },
      projectId,
      existing.organizationId,
    );
    return updated;
  }

  /**
   * Delete a MEMORY entry by name within a project.
   */
  async deleteMemoryByName(projectId: string, name: string): Promise<void> {
    const existing = await this.instructionRepository.findByNameAndType(name, 'MEMORY', projectId);

    if (!existing) {
      throw new MemoryEntryNotFoundException(name);
    }

    await this.instructionRepository.delete(existing.id);
    this.triggerEmbeddingDelete(existing.id);
    this.logAudit(
      AuditAction.INSTRUCTION_DELETED,
      existing.id,
      {
        name,
        type: 'MEMORY',
      },
      projectId,
      existing.organizationId,
    );
  }

  /**
   * Merge public + organization + project-private instructions by type.
   * Override order: PUBLIC < ORGANIZATION < PRIVATE (by name).
   * Optionally filter by a single visibility tier (no merge).
   *
   * When contextProjects are provided, merges in their PRIVATE instructions:
   * - priorityOverParent=false: fill gaps (before parent PRIVATE)
   * - priorityOverParent=true: override parent (after parent PRIVATE)
   */
  async findMerged(
    projectId: string,
    organizationId: string,
    type: InstructionType,
    options?: {
      name?: string;
      visibility?: InstructionVisibility;
      contextProjects?: { id: string; priorityOverParent: boolean }[];
    },
  ): Promise<Instruction[]> {
    if (options?.visibility) {
      const instructions = await this.findByVisibility(
        projectId,
        organizationId,
        type,
        options.visibility,
      );
      return options.name ? instructions.filter((i) => i.name === options.name) : instructions;
    }

    const merged =
      options?.contextProjects && options.contextProjects.length > 0
        ? await this.findMergedWithContext(projectId, organizationId, type, options.contextProjects)
        : await this.findMergedByType(projectId, organizationId, type);

    if (options?.name) {
      return merged.filter((i) => i.name === options.name);
    }

    return merged;
  }

  /**
   * Search merged instructions by keyword query.
   * Uses hybrid search (semantic + keyword) when available, falls back to keyword-only.
   * Returns lightweight results (no content) sorted by relevance score.
   */
  async searchMerged(
    projectId: string,
    organizationId: string,
    query: string,
    options?: {
      type?: InstructionType;
      limit?: number;
      visibility?: InstructionVisibility;
      contextProjects?: { id: string; priorityOverParent: boolean }[];
    },
  ): Promise<InstructionSearchResponseDto> {
    const limit = options?.limit ?? INSTRUCTION_DEFAULTS.SEARCH_DEFAULT_LIMIT;
    const types = options?.type ? [options.type] : [...INSTRUCTION_TYPES];

    // Fetch merged instructions for each type in parallel
    const allInstructions = (
      await Promise.all(
        types.map((t) =>
          this.findMerged(projectId, organizationId, t, {
            visibility: options?.visibility,
            contextProjects: options?.contextProjects,
          }),
        ),
      )
    ).flat();

    // Try hybrid search if available
    if (this.searchService?.isEnabled()) {
      try {
        const hybridResult = await this.searchService.search(allInstructions, query, {
          topK: limit,
        });

        const results: InstructionSearchResultDto[] = hybridResult.results.map((r) => ({
          name: r.instruction.name,
          type: r.instruction.type,
          visibility: r.instruction.visibility,
          description: r.instruction.description,
          score: Math.round(r.combinedScore * 100) / 100,
        }));

        return { results, total: results.length, query };
      } catch (error) {
        this.logger.warn(
          `Hybrid search failed, falling back to keyword: ${error instanceof Error ? error.message : error}`,
        );
      }
    }

    // Keyword-only fallback
    const scored = this.scoreInstructions(allInstructions, query);

    const results: InstructionSearchResultDto[] = scored
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((r) => ({
        name: r.instruction.name,
        type: r.instruction.type,
        visibility: r.instruction.visibility,
        description: r.instruction.description,
        score: r.score,
      }));

    return { results, total: results.length, query };
  }

  /**
   * Merge instructions with context projects.
   * Order: PUBLIC < ORGANIZATION < context(fill) < PRIVATE < context(priority).
   */
  private async findMergedWithContext(
    projectId: string,
    organizationId: string,
    type: InstructionType,
    contextProjects: { id: string; priorityOverParent: boolean }[],
  ): Promise<Instruction[]> {
    const fillProjects = contextProjects.filter((cp) => !cp.priorityOverParent);
    const priorityProjects = contextProjects.filter((cp) => cp.priorityOverParent);

    const [publicInstructions, orgInstructions, privateInstructions, ...contextResults] =
      await Promise.all([
        this.instructionRepository.findPublicByType(type),
        this.instructionRepository.findByOrganizationIdAndType(organizationId, type),
        this.instructionRepository.findByProjectIdAndType(projectId, type),
        ...contextProjects.map((cp) =>
          this.instructionRepository.findByProjectIdAndType(cp.id, type),
        ),
      ]);

    // Build lookup for context project results
    const contextMap = new Map<string, Instruction[]>();
    contextProjects.forEach((cp, i) => {
      contextMap.set(cp.id, contextResults[i]);
    });

    const merged = new Map<string, Instruction>();

    // 1. PUBLIC
    for (const i of publicInstructions) merged.set(i.name, i);

    // 2. ORGANIZATION
    for (const i of orgInstructions) merged.set(i.name, i);

    // 3. Context projects (fill gaps — only set if not already present)
    for (const cp of fillProjects) {
      for (const i of contextMap.get(cp.id) ?? []) {
        if (!merged.has(i.name)) merged.set(i.name, i);
      }
    }

    // 4. PRIVATE (parent project — always wins over fill)
    for (const i of privateInstructions) merged.set(i.name, i);

    // 5. Context projects (priority — override parent)
    for (const cp of priorityProjects) {
      for (const i of contextMap.get(cp.id) ?? []) {
        merged.set(i.name, i);
      }
    }

    return Array.from(merged.values());
  }

  /**
   * Merge public + organization + project-private instructions for a single type.
   * Override order: PUBLIC → ORGANIZATION overrides → PRIVATE overrides (by name).
   */
  private async findMergedByType(
    projectId: string,
    organizationId: string,
    type: InstructionType,
  ): Promise<Instruction[]> {
    const [publicInstructions, orgInstructions, privateInstructions] = await Promise.all([
      this.instructionRepository.findPublicByType(type),
      this.instructionRepository.findByOrganizationIdAndType(organizationId, type),
      this.instructionRepository.findByProjectIdAndType(projectId, type),
    ]);

    const merged = new Map<string, Instruction>();

    for (const instruction of publicInstructions) {
      merged.set(instruction.name, instruction);
    }

    for (const instruction of orgInstructions) {
      merged.set(instruction.name, instruction);
    }

    for (const instruction of privateInstructions) {
      merged.set(instruction.name, instruction);
    }

    return Array.from(merged.values());
  }

  /**
   * Fetch instructions for a single visibility tier (no merge).
   */
  private async findByVisibility(
    projectId: string,
    organizationId: string,
    type: InstructionType,
    visibility: InstructionVisibility,
  ): Promise<Instruction[]> {
    switch (visibility) {
      case 'PUBLIC':
        return this.instructionRepository.findPublicByType(type);
      case 'ORGANIZATION':
        return this.instructionRepository.findByOrganizationIdAndType(organizationId, type);
      case 'PRIVATE':
        return this.instructionRepository.findByProjectIdAndType(projectId, type);
    }
  }

  /**
   * Check if an instruction is accessible given the caller's project and organization context.
   * PUBLIC: visible to all. ORGANIZATION: must match organizationId. PRIVATE: must match projectId.
   */
  private canAccessInstruction(
    instruction: Instruction,
    projectId: string,
    organizationId: string,
  ): boolean {
    switch (instruction.visibility) {
      case 'PUBLIC':
        return true;
      case 'ORGANIZATION':
        return instruction.organizationId === organizationId;
      case 'PRIVATE':
        return instruction.projectId === projectId;
    }
  }

  /**
   * Fire-and-forget embedding trigger for an instruction.
   * Never throws to caller.
   */
  private triggerEmbedding(instruction: Instruction): void {
    if (!this.embeddingService?.isEnabled()) return;

    this.embeddingService
      .embedInstruction({
        instructionId: instruction.id,
        projectId: instruction.projectId,
        organizationId: instruction.organizationId,
        name: instruction.name,
        description: instruction.description,
        content: instruction.content,
      })
      .catch((err) => {
        this.logger.warn(
          `Embedding failed for instruction ${instruction.id}: ${err instanceof Error ? err.message : err}`,
        );
      });
  }

  /**
   * Fire-and-forget embedding deletion for an instruction.
   * Never throws to caller.
   */
  private triggerEmbeddingDelete(instructionId: string): void {
    if (!this.embeddingService?.isEnabled()) return;

    this.embeddingService.deleteEmbedding(instructionId).catch((err) => {
      this.logger.warn(
        `Embedding deletion failed for instruction ${instructionId}: ${err instanceof Error ? err.message : err}`,
      );
    });
  }

  /**
   * Fire-and-forget audit log for instruction operations.
   * Never throws to caller (optional chaining on service).
   */
  private logAudit(
    action: AuditAction,
    resourceId: string,
    metadata: Record<string, unknown>,
    projectId?: string | null,
    organizationId?: string | null,
  ): void {
    this.auditLogService?.log({
      action,
      category: AuditCategory.INSTRUCTION,
      resourceType: ResourceType.INSTRUCTION,
      resourceId,
      metadata,
      ...(projectId !== undefined && { projectId }),
      ...(organizationId !== undefined && { organizationId }),
    });
  }

  /**
   * Score instructions against a keyword query.
   * Delegates to shared keyword scoring utility.
   */
  private scoreInstructions(
    instructions: Instruction[],
    query: string,
  ): { instruction: Instruction; score: number }[] {
    const scores = scoreByKeywords(instructions, query, INSTRUCTION_SEARCH_WEIGHTS);
    const scoreMap = new Map(scores.map((s) => [s.id, s.score]));

    return instructions.map((instruction) => ({
      instruction,
      score: scoreMap.get(instruction.id) ?? 0,
    }));
  }
}
