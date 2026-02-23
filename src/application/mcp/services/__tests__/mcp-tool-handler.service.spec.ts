import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpToolHandlerService } from '@/application/mcp/services/mcp-tool-handler.service';
import { InstructionService } from '@/application/instructions/services/instruction.service';
import { TenantContextService } from '@/common/services/tenant-context.service';
import { QueryOrchestratorService } from '@/application/query/services/query-orchestrator.service';
import { DocumentAccessService } from '@/application/documents/services/document-access.service';
import type { DocumentIngestionService } from '@/application/ingestion/services/document-ingestion.service';
import type { IStructuredLogger } from '@/core/interfaces/services/observability.interface';
import type { Instruction } from '@/core/entities/instruction.entity';
import type { ISourceFetcher } from '@/core/interfaces/services/source-fetcher.interface';
import type { IAuditLogService } from '@/core/interfaces/services/audit-log.interface';
import {
  MemoryEntryNotFoundException,
  InstructionNotFoundException,
} from '@/core/exceptions/instruction.exception';
import { MEMORY_DEFAULT_DESCRIPTION } from '@/application/instructions/instructions.constants';
import type { IngestResult } from '@/application/ingestion/dto/ingest-document.dto';

const createTestInstruction = (overrides: Partial<Instruction> = {}): Instruction => ({
  id: 'instr-1',
  name: 'test-memory',
  type: 'MEMORY',
  visibility: 'PRIVATE',
  description: MEMORY_DEFAULT_DESCRIPTION,
  content: '# Test Memory',
  metadata: {},
  projectId: 'proj-1',
  organizationId: 'org-1',
  createdAt: new Date('2026-01-15T10:00:00.000Z'),
  updatedAt: new Date('2026-01-15T10:00:00.000Z'),
  ...overrides,
});

describe('McpToolHandlerService — Memory Write Tools', () => {
  let service: McpToolHandlerService;
  let mockInstructionService: {
    upsertMemory: ReturnType<typeof vi.fn>;
    replaceMemoryContent: ReturnType<typeof vi.fn>;
    deleteMemoryByName: ReturnType<typeof vi.fn>;
    findMerged: ReturnType<typeof vi.fn>;
    searchMerged: ReturnType<typeof vi.fn>;
    upsertInstruction: ReturnType<typeof vi.fn>;
    deleteByNameAndType: ReturnType<typeof vi.fn>;
  };
  let mockTenantContext: {
    getContextOrNull: ReturnType<typeof vi.fn>;
    getProjectId: ReturnType<typeof vi.fn>;
    getOrganizationId: ReturnType<typeof vi.fn>;
    getContext: ReturnType<typeof vi.fn>;
    getContextProjectIdsForType: ReturnType<typeof vi.fn>;
  };
  let mockLogger: IStructuredLogger;
  let mockAuditLogService: IAuditLogService;

  beforeEach(() => {
    mockInstructionService = {
      upsertMemory: vi.fn(),
      replaceMemoryContent: vi.fn(),
      deleteMemoryByName: vi.fn(),
      findMerged: vi.fn(),
      searchMerged: vi.fn(),
      upsertInstruction: vi.fn(),
      deleteByNameAndType: vi.fn(),
    };

    mockTenantContext = {
      getContextOrNull: vi.fn().mockReturnValue({ project: { id: 'proj-1' } }),
      getProjectId: vi.fn().mockReturnValue('proj-1'),
      getOrganizationId: vi.fn().mockReturnValue('org-1'),
      getContext: vi.fn().mockReturnValue({ project: { id: 'proj-1' } }),
      getContextProjectIdsForType: vi.fn().mockReturnValue([]),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as IStructuredLogger;

    mockAuditLogService = {
      log: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(true),
    } as unknown as IAuditLogService;

    service = new McpToolHandlerService(
      {} as QueryOrchestratorService,
      {} as DocumentAccessService,
      mockInstructionService as unknown as InstructionService,
      mockTenantContext as unknown as TenantContextService,
      {} as unknown as DocumentIngestionService,
      { fetch: vi.fn() } as unknown as ISourceFetcher,
      mockLogger,
      undefined, // instructionBackfillService
      undefined, // embeddingBackfillService
      mockAuditLogService,
    );
  });

  describe('handleSaveMemory', () => {
    it('should return success with created status for new entry', async () => {
      const instruction = createTestInstruction({ name: 'conventions', content: '# Conv' });
      mockInstructionService.upsertMemory.mockResolvedValue({ instruction, created: true });

      const result = await service.handleSaveMemory({ name: 'conventions', content: '# Conv' });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.name).toBe('conventions');
      expect(data.status).toBe('created');
    });

    it('should return success with updated status for existing entry', async () => {
      const instruction = createTestInstruction({ name: 'conventions', content: '# Updated' });
      mockInstructionService.upsertMemory.mockResolvedValue({ instruction, created: false });

      const result = await service.handleSaveMemory({
        name: 'conventions',
        content: '# Updated',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.status).toBe('updated');
    });

    it('should return error when no project context', async () => {
      mockTenantContext.getContextOrNull.mockReturnValue(null);

      const result = await service.handleSaveMemory({ name: 'test', content: 'content' });

      expect(result.isError).toBe(true);
    });

    it('should handle service errors gracefully', async () => {
      mockInstructionService.upsertMemory.mockRejectedValue(new Error('DB error'));

      const result = await service.handleSaveMemory({ name: 'test', content: 'content' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('unexpected error');
    });
  });

  describe('handleUpdateMemory', () => {
    it('should return success after str_replace', async () => {
      const instruction = createTestInstruction({
        name: 'conventions',
        content: '# Conventions\n- Use bun',
      });
      mockInstructionService.replaceMemoryContent.mockResolvedValue(instruction);

      const result = await service.handleUpdateMemory({
        name: 'conventions',
        old_str: 'Use pnpm',
        new_str: 'Use bun',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.name).toBe('conventions');
      expect(data.status).toBe('updated');
    });

    it('should return error for not-found entry', async () => {
      mockInstructionService.replaceMemoryContent.mockRejectedValue(
        new MemoryEntryNotFoundException('nonexistent'),
      );

      const result = await service.handleUpdateMemory({
        name: 'nonexistent',
        old_str: 'old',
        new_str: 'new',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Memory entry 'nonexistent' not found");
    });

    it('should handle missing entry for update', async () => {
      mockInstructionService.replaceMemoryContent.mockRejectedValue(
        new MemoryEntryNotFoundException('test'),
      );

      const result = await service.handleUpdateMemory({
        name: 'test',
        old_str: 'old',
        new_str: 'new',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Memory entry 'test' not found");
    });
  });

  describe('handleDeleteMemory', () => {
    it('should return success with deleted confirmation', async () => {
      mockInstructionService.deleteMemoryByName.mockResolvedValue(undefined);

      const result = await service.handleDeleteMemory({ name: 'conventions' });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.name).toBe('conventions');
      expect(data.status).toBe('deleted');
    });

    it('should return error for not-found entry', async () => {
      mockInstructionService.deleteMemoryByName.mockRejectedValue(
        new MemoryEntryNotFoundException('nonexistent'),
      );

      const result = await service.handleDeleteMemory({ name: 'nonexistent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Memory entry 'nonexistent' not found");
    });
  });
});

describe('McpToolHandlerService — Template Tools', () => {
  let service: McpToolHandlerService;
  let mockInstructionService: {
    upsertMemory: ReturnType<typeof vi.fn>;
    replaceMemoryContent: ReturnType<typeof vi.fn>;
    deleteMemoryByName: ReturnType<typeof vi.fn>;
    findMerged: ReturnType<typeof vi.fn>;
    searchMerged: ReturnType<typeof vi.fn>;
    upsertInstruction: ReturnType<typeof vi.fn>;
    deleteByNameAndType: ReturnType<typeof vi.fn>;
  };
  let mockTenantContext: {
    getContextOrNull: ReturnType<typeof vi.fn>;
    getProjectId: ReturnType<typeof vi.fn>;
    getOrganizationId: ReturnType<typeof vi.fn>;
    getContext: ReturnType<typeof vi.fn>;
    getContextProjectIdsForType: ReturnType<typeof vi.fn>;
  };
  let mockLogger: IStructuredLogger;

  beforeEach(() => {
    mockInstructionService = {
      upsertMemory: vi.fn(),
      replaceMemoryContent: vi.fn(),
      deleteMemoryByName: vi.fn(),
      findMerged: vi.fn(),
      searchMerged: vi.fn(),
      upsertInstruction: vi.fn(),
      deleteByNameAndType: vi.fn(),
    };

    mockTenantContext = {
      getContextOrNull: vi.fn().mockReturnValue({ project: { id: 'proj-1' } }),
      getProjectId: vi.fn().mockReturnValue('proj-1'),
      getOrganizationId: vi.fn().mockReturnValue('org-1'),
      getContext: vi.fn().mockReturnValue({ project: { id: 'proj-1' } }),
      getContextProjectIdsForType: vi.fn().mockReturnValue([]),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as IStructuredLogger;

    service = new McpToolHandlerService(
      {} as QueryOrchestratorService,
      {} as DocumentAccessService,
      mockInstructionService as unknown as InstructionService,
      mockTenantContext as unknown as TenantContextService,
      {} as unknown as DocumentIngestionService,
      { fetch: vi.fn() } as unknown as ISourceFetcher,
      mockLogger,
    );
  });

  // Note: no audit mock needed here — tests template CRUD, audit is optional

  describe('handleGetTemplates', () => {
    it('should return lightweight listing when no name provided', async () => {
      const templates = [
        createTestInstruction({ name: 'prompt', type: 'TEMPLATE', description: 'Prompt template' }),
        createTestInstruction({
          name: 'request',
          type: 'TEMPLATE',
          description: 'Request template',
        }),
      ];
      mockInstructionService.findMerged.mockResolvedValue(templates);

      const result = await service.handleGetTemplates({});

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveLength(2);
      expect(data[0].name).toBe('prompt');
      expect(data[0].description).toBe('Prompt template');
      expect(data[0].content).toBeUndefined();
    });

    it('should return full content when name is provided', async () => {
      const templates = [
        createTestInstruction({
          name: 'prompt',
          type: 'TEMPLATE',
          description: 'Prompt template',
          content: '# Prompt Template\nFull content here',
        }),
      ];
      mockInstructionService.findMerged.mockResolvedValue(templates);

      const result = await service.handleGetTemplates({ name: 'prompt' });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveLength(1);
      expect(data[0].name).toBe('prompt');
      expect(data[0].content).toBe('# Prompt Template\nFull content here');
    });

    it('should call findMerged with TEMPLATE type', async () => {
      mockInstructionService.findMerged.mockResolvedValue([]);

      await service.handleGetTemplates({});

      expect(mockInstructionService.findMerged).toHaveBeenCalledWith(
        'proj-1',
        'org-1',
        'TEMPLATE',
        expect.objectContaining({ name: undefined }),
      );
    });
  });

  describe('handleSaveTemplates', () => {
    it('should return success with created status for new template', async () => {
      const instruction = createTestInstruction({ name: 'prompt', type: 'TEMPLATE' });
      mockInstructionService.upsertInstruction.mockResolvedValue({
        instruction,
        created: true,
        unchanged: false,
      });

      const result = await service.handleSaveTemplates({
        name: 'prompt',
        description: 'Prompt template',
        content: '# Prompt',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.status).toBe('created');
      expect(data.type).toBe('TEMPLATE');
    });

    it('should call upsertInstruction with TEMPLATE type', async () => {
      const instruction = createTestInstruction({ name: 'prompt', type: 'TEMPLATE' });
      mockInstructionService.upsertInstruction.mockResolvedValue({
        instruction,
        created: true,
        unchanged: false,
      });

      await service.handleSaveTemplates({
        name: 'prompt',
        description: 'Prompt template',
        content: '# Prompt',
      });

      expect(mockInstructionService.upsertInstruction).toHaveBeenCalledWith(
        'proj-1',
        'org-1',
        expect.objectContaining({ name: 'prompt', type: 'TEMPLATE' }),
      );
    });
  });

  describe('handleDeleteTemplates', () => {
    it('should return success with deleted confirmation', async () => {
      mockInstructionService.deleteByNameAndType.mockResolvedValue(undefined);

      const result = await service.handleDeleteTemplates({ name: 'prompt' });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.name).toBe('prompt');
      expect(data.type).toBe('TEMPLATE');
      expect(data.status).toBe('deleted');
    });

    it('should return error for not-found template', async () => {
      mockInstructionService.deleteByNameAndType.mockRejectedValue(
        new InstructionNotFoundException('nonexistent'),
      );

      const result = await service.handleDeleteTemplates({ name: 'nonexistent' });

      expect(result.isError).toBe(true);
    });

    it('should call deleteByNameAndType with TEMPLATE type', async () => {
      mockInstructionService.deleteByNameAndType.mockResolvedValue(undefined);

      await service.handleDeleteTemplates({ name: 'prompt' });

      expect(mockInstructionService.deleteByNameAndType).toHaveBeenCalledWith(
        'proj-1',
        'prompt',
        'TEMPLATE',
      );
    });
  });
});

describe('McpToolHandlerService — Save Documents', () => {
  let service: McpToolHandlerService;
  let mockIngestionService: {
    ingest: ReturnType<typeof vi.fn>;
    ingestFromSource: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockTenantContext: {
    getContextOrNull: ReturnType<typeof vi.fn>;
    getProjectId: ReturnType<typeof vi.fn>;
    getOrganizationId: ReturnType<typeof vi.fn>;
    getContext: ReturnType<typeof vi.fn>;
    getContextProjectIdsForType: ReturnType<typeof vi.fn>;
  };
  let mockLogger: IStructuredLogger;

  const createdResult: IngestResult = {
    success: true,
    documentId: 'doc-1',
    action: 'created',
  };

  beforeEach(() => {
    mockIngestionService = {
      ingest: vi.fn().mockResolvedValue(createdResult),
      ingestFromSource: vi.fn().mockResolvedValue(createdResult),
      delete: vi.fn(),
    };

    mockTenantContext = {
      getContextOrNull: vi.fn().mockReturnValue({ project: { id: 'proj-1' } }),
      getProjectId: vi.fn().mockReturnValue('proj-1'),
      getOrganizationId: vi.fn().mockReturnValue('org-1'),
      getContext: vi.fn().mockReturnValue({ project: { id: 'proj-1' } }),
      getContextProjectIdsForType: vi.fn().mockReturnValue([]),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as IStructuredLogger;

    service = new McpToolHandlerService(
      {} as QueryOrchestratorService,
      {} as DocumentAccessService,
      {} as unknown as InstructionService,
      mockTenantContext as unknown as TenantContextService,
      mockIngestionService as unknown as DocumentIngestionService,
      { fetch: vi.fn() } as unknown as ISourceFetcher,
      mockLogger,
    );
  });

  // Note: no audit mock needed here — tests document save, audit is optional

  describe('handleSaveDocuments', () => {
    it('should call ingest() for manual mode with title and content', async () => {
      const result = await service.handleSaveDocuments({
        title: 'My Doc',
        content: '# Hello',
      });

      expect(result.isError).toBeUndefined();
      expect(mockIngestionService.ingest).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          title: 'My Doc',
          content: '# Hello',
          sourceType: 'MANUAL',
        }),
      );
      expect(mockIngestionService.ingestFromSource).not.toHaveBeenCalled();
    });

    it('should call ingest() for manual mode with sourceUrl metadata', async () => {
      const result = await service.handleSaveDocuments({
        title: 'My Doc',
        content: '# Hello',
        sourceUrl: 'https://example.com/doc',
      });

      expect(result.isError).toBeUndefined();
      expect(mockIngestionService.ingest).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Doc',
          content: '# Hello',
          sourceUrl: 'https://example.com/doc',
        }),
      );
    });

    it('should call ingestFromSource() for URL mode with sourceUrl only', async () => {
      const result = await service.handleSaveDocuments({
        sourceUrl: 'https://example.com/doc',
      });

      expect(result.isError).toBeUndefined();
      expect(mockIngestionService.ingestFromSource).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          organizationId: 'org-1',
          sourceType: 'URL',
          sourceUrl: 'https://example.com/doc',
        }),
      );
      expect(mockIngestionService.ingest).not.toHaveBeenCalled();
    });

    it('should pass title override to ingestFromSource() for URL mode', async () => {
      const result = await service.handleSaveDocuments({
        title: 'Custom Title',
        sourceUrl: 'https://example.com/doc',
      });

      expect(result.isError).toBeUndefined();
      expect(mockIngestionService.ingestFromSource).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceUrl: 'https://example.com/doc',
          title: 'Custom Title',
        }),
      );
    });

    it('should return validation error when both content and sourceUrl are missing', async () => {
      const result = await service.handleSaveDocuments({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Either content or sourceUrl must be provided');
    });

    it('should return validation error when content is provided without title', async () => {
      const result = await service.handleSaveDocuments({ content: '# Hello' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('title is required when content is provided');
    });

    it('should return error when ingestFromSource fails', async () => {
      mockIngestionService.ingestFromSource.mockRejectedValue(new Error('Network error'));

      const result = await service.handleSaveDocuments({
        sourceUrl: 'https://example.com/doc',
      });

      expect(result.isError).toBe(true);
    });
  });
});

describe('McpToolHandlerService — Instruction URL Auto-Fetch', () => {
  let service: McpToolHandlerService;
  let mockInstructionService: {
    upsertInstruction: ReturnType<typeof vi.fn>;
    upsertMemory: ReturnType<typeof vi.fn>;
    replaceMemoryContent: ReturnType<typeof vi.fn>;
    deleteMemoryByName: ReturnType<typeof vi.fn>;
    findMerged: ReturnType<typeof vi.fn>;
    searchMerged: ReturnType<typeof vi.fn>;
    deleteByNameAndType: ReturnType<typeof vi.fn>;
  };
  let mockUrlFetcher: { fetch: ReturnType<typeof vi.fn>; sourceType: string };
  let mockTenantContext: {
    getProjectId: ReturnType<typeof vi.fn>;
    getOrganizationId: ReturnType<typeof vi.fn>;
    getContext: ReturnType<typeof vi.fn>;
    getContextOrNull: ReturnType<typeof vi.fn>;
    getContextProjectIdsForType: ReturnType<typeof vi.fn>;
  };
  let mockLogger: IStructuredLogger;

  beforeEach(() => {
    mockInstructionService = {
      upsertInstruction: vi.fn(),
      upsertMemory: vi.fn(),
      replaceMemoryContent: vi.fn(),
      deleteMemoryByName: vi.fn(),
      findMerged: vi.fn(),
      searchMerged: vi.fn(),
      deleteByNameAndType: vi.fn(),
    };

    mockUrlFetcher = {
      fetch: vi.fn(),
      sourceType: 'URL',
    };

    mockTenantContext = {
      getProjectId: vi.fn().mockReturnValue('proj-1'),
      getOrganizationId: vi.fn().mockReturnValue('org-1'),
      getContext: vi.fn().mockReturnValue({ project: { id: 'proj-1' } }),
      getContextOrNull: vi.fn().mockReturnValue({ project: { id: 'proj-1' } }),
      getContextProjectIdsForType: vi.fn().mockReturnValue([]),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as IStructuredLogger;

    service = new McpToolHandlerService(
      {} as QueryOrchestratorService,
      {} as DocumentAccessService,
      mockInstructionService as unknown as InstructionService,
      mockTenantContext as unknown as TenantContextService,
      {} as unknown as DocumentIngestionService,
      mockUrlFetcher as unknown as ISourceFetcher,
      mockLogger,
    );
  });

  it('should fetch content from URL when sourceUrl provided without content', async () => {
    mockUrlFetcher.fetch.mockResolvedValue({
      success: true,
      document: {
        title: 'Fetched',
        content: '# Fetched Content',
        sourceUrl: 'https://example.com/skill.md',
      },
    });
    const instruction = createTestInstruction({ name: 'url-skill', type: 'SKILL' });
    mockInstructionService.upsertInstruction.mockResolvedValue({
      instruction,
      created: true,
      unchanged: false,
    });

    const result = await service.handleSaveSkills({
      name: 'url-skill',
      description: 'Skill from URL',
      sourceUrl: 'https://example.com/skill.md',
    });

    expect(result.isError).toBeUndefined();
    expect(mockUrlFetcher.fetch).toHaveBeenCalledWith('https://example.com/skill.md');
    expect(mockInstructionService.upsertInstruction).toHaveBeenCalledWith(
      'proj-1',
      'org-1',
      expect.objectContaining({ content: '# Fetched Content' }),
    );
  });

  it('should use provided content when both content and sourceUrl given', async () => {
    const instruction = createTestInstruction({ name: 'manual-agent', type: 'AGENT' });
    mockInstructionService.upsertInstruction.mockResolvedValue({
      instruction,
      created: true,
      unchanged: false,
    });

    const result = await service.handleSaveAgents({
      name: 'manual-agent',
      description: 'Agent with content',
      content: '# Manual Content',
      sourceUrl: 'https://example.com/agent.md',
    });

    expect(result.isError).toBeUndefined();
    expect(mockUrlFetcher.fetch).not.toHaveBeenCalled();
    expect(mockInstructionService.upsertInstruction).toHaveBeenCalledWith(
      'proj-1',
      'org-1',
      expect.objectContaining({ content: '# Manual Content' }),
    );
  });

  it('should return validation error when neither content nor sourceUrl provided', async () => {
    const result = await service.handleSaveCommands({
      name: 'bad-command',
      description: 'Missing content',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Either content or sourceUrl must be provided');
    expect(mockInstructionService.upsertInstruction).not.toHaveBeenCalled();
  });

  it('should return error when URL fetch fails', async () => {
    mockUrlFetcher.fetch.mockResolvedValue({
      success: false,
      error: 'HTTP 404: Not Found',
    });

    const result = await service.handleSaveTemplates({
      name: 'bad-template',
      description: 'Template from bad URL',
      sourceUrl: 'https://example.com/missing.md',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to fetch content from URL');
    expect(result.content[0].text).toContain('HTTP 404');
    expect(mockInstructionService.upsertInstruction).not.toHaveBeenCalled();
  });

  it('should still work in manual mode with content provided directly', async () => {
    const instruction = createTestInstruction({ name: 'manual-cmd', type: 'COMMAND' });
    mockInstructionService.upsertInstruction.mockResolvedValue({
      instruction,
      created: false,
      unchanged: false,
    });

    const result = await service.handleSaveCommands({
      name: 'manual-cmd',
      description: 'Manual command',
      content: '# Manual',
    });

    expect(result.isError).toBeUndefined();
    expect(mockUrlFetcher.fetch).not.toHaveBeenCalled();
    const data = JSON.parse(result.content[0].text);
    expect(data.status).toBe('updated');
  });
});
