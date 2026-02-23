import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InstructionService } from '@/application/instructions/services/instruction.service';
import {
  InstructionNotFoundException,
  InstructionDuplicateException,
  MemoryEntryNotFoundException,
  MemoryContentReplaceException,
} from '@/core/exceptions/instruction.exception';
import { MEMORY_DEFAULT_DESCRIPTION } from '@/application/instructions/instructions.constants';
import type { IInstructionRepository } from '@/core/interfaces/repositories/instruction.repository.interface';
import type { Instruction } from '@/core/entities/instruction.entity';
import type { IAuditLogService } from '@/core/interfaces/services/audit-log.interface';
import { AuditAction } from '@/application/audit/audit.constants';

const createTestInstruction = (overrides: Partial<Instruction> = {}): Instruction => ({
  id: 'instr-1',
  name: 'test-agent',
  type: 'AGENT',
  visibility: 'PRIVATE',
  description: 'Test agent',
  content: '# Test Agent\n\nInstructions here.',
  metadata: {},
  projectId: 'proj-1',
  organizationId: 'org-1',
  createdAt: new Date('2026-01-15T10:00:00.000Z'),
  updatedAt: new Date('2026-01-15T10:00:00.000Z'),
  ...overrides,
});

describe('InstructionService', () => {
  let service: InstructionService;
  let mockRepository: {
    findByProjectId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findPublicByType: ReturnType<typeof vi.fn>;
    findByProjectIdAndType: ReturnType<typeof vi.fn>;
    findByOrganizationIdAndType: ReturnType<typeof vi.fn>;
    findByNameAndType: ReturnType<typeof vi.fn>;
    findByNameAndTypeForOrganization: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockAuditLogService: { log: ReturnType<typeof vi.fn>; isEnabled: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRepository = {
      findByProjectId: vi.fn(),
      findById: vi.fn(),
      findPublicByType: vi.fn(),
      findByProjectIdAndType: vi.fn(),
      findByOrganizationIdAndType: vi.fn(),
      findByNameAndType: vi.fn(),
      findByNameAndTypeForOrganization: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockAuditLogService = {
      log: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(true),
    };

    service = new InstructionService(
      mockRepository as unknown as IInstructionRepository,
      undefined, // embeddingService
      undefined, // searchService
      mockAuditLogService as unknown as IAuditLogService,
    );
  });

  describe('create', () => {
    it('should create a PRIVATE instruction with correct projectId', async () => {
      mockRepository.findByNameAndType.mockResolvedValue(null);
      const created = createTestInstruction();
      mockRepository.create.mockResolvedValue(created);

      const result = await service.create('proj-1', 'org-1', {
        name: 'test-agent',
        type: 'AGENT',
        description: 'Test agent',
        content: '# Test',
      });

      expect(result).toEqual(created);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: 'PRIVATE',
          projectId: 'proj-1',
          organizationId: 'org-1',
        }),
      );
    });

    it('should reject duplicate name+type within same project', async () => {
      mockRepository.findByNameAndType.mockResolvedValue(createTestInstruction());

      await expect(
        service.create('proj-1', 'org-1', {
          name: 'test-agent',
          type: 'AGENT',
          description: 'Duplicate',
          content: '# Dup',
        }),
      ).rejects.toThrow(InstructionDuplicateException);
    });

    it('should create an ORGANIZATION instruction with null projectId', async () => {
      mockRepository.findByNameAndTypeForOrganization.mockResolvedValue(null);
      const created = createTestInstruction({
        visibility: 'ORGANIZATION',
        projectId: null,
        organizationId: 'org-1',
      });
      mockRepository.create.mockResolvedValue(created);

      const result = await service.create('proj-1', 'org-1', {
        name: 'test-agent',
        type: 'AGENT',
        description: 'Org agent',
        content: '# Org',
        visibility: 'ORGANIZATION',
      });

      expect(result).toEqual(created);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: 'ORGANIZATION',
          projectId: null,
          organizationId: 'org-1',
        }),
      );
    });

    it('should reject duplicate ORGANIZATION instruction within same org', async () => {
      mockRepository.findByNameAndTypeForOrganization.mockResolvedValue(
        createTestInstruction({ visibility: 'ORGANIZATION', projectId: null }),
      );

      await expect(
        service.create('proj-1', 'org-1', {
          name: 'test-agent',
          type: 'AGENT',
          description: 'Dup org',
          content: '# Dup',
          visibility: 'ORGANIZATION',
        }),
      ).rejects.toThrow(InstructionDuplicateException);
    });
  });

  describe('findByProjectId', () => {
    it('should return paginated results', async () => {
      const instructions = [
        createTestInstruction({ id: 'i-1', createdAt: new Date('2026-01-15') }),
        createTestInstruction({ id: 'i-2', createdAt: new Date('2026-01-14') }),
        createTestInstruction({ id: 'i-3', createdAt: new Date('2026-01-13') }),
      ];
      mockRepository.findByProjectId.mockResolvedValue(instructions);

      const result = await service.findByProjectId('proj-1', { page: 1, limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
    });

    it('should filter by type when provided', async () => {
      const agents = [createTestInstruction({ id: 'i-1', type: 'AGENT' })];
      mockRepository.findByProjectIdAndType.mockResolvedValue(agents);

      const result = await service.findByProjectId('proj-1', { type: 'AGENT' });

      expect(mockRepository.findByProjectIdAndType).toHaveBeenCalledWith('proj-1', 'AGENT');
      expect(result.data).toHaveLength(1);
    });

    it('should return all types when no type filter', async () => {
      mockRepository.findByProjectId.mockResolvedValue([]);

      await service.findByProjectId('proj-1', {});

      expect(mockRepository.findByProjectId).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('findById', () => {
    it('should return instruction when found and belongs to project', async () => {
      const instruction = createTestInstruction({ projectId: 'proj-1' });
      mockRepository.findById.mockResolvedValue(instruction);

      const result = await service.findById('proj-1', 'org-1', 'instr-1');

      expect(result).toEqual(instruction);
    });

    it('should throw InstructionNotFoundException when not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.findById('proj-1', 'org-1', 'nonexistent')).rejects.toThrow(
        InstructionNotFoundException,
      );
    });

    it('should throw InstructionNotFoundException for cross-project access (404 not 403)', async () => {
      const instruction = createTestInstruction({ projectId: 'proj-2' });
      mockRepository.findById.mockResolvedValue(instruction);

      const error = await service.findById('proj-1', 'org-1', 'instr-1').catch((e) => e);

      expect(error).toBeInstanceOf(InstructionNotFoundException);
      expect(error.code).toBe('INSTRUCTION_NOT_FOUND');
    });

    it('should return ORGANIZATION instruction when organizationId matches', async () => {
      const orgInstruction = createTestInstruction({
        visibility: 'ORGANIZATION',
        projectId: null,
        organizationId: 'org-1',
      });
      mockRepository.findById.mockResolvedValue(orgInstruction);

      const result = await service.findById('proj-1', 'org-1', 'instr-1');

      expect(result).toEqual(orgInstruction);
    });

    it('should throw InstructionNotFoundException for cross-org access to ORGANIZATION instruction', async () => {
      const orgInstruction = createTestInstruction({
        visibility: 'ORGANIZATION',
        projectId: null,
        organizationId: 'org-2',
      });
      mockRepository.findById.mockResolvedValue(orgInstruction);

      await expect(service.findById('proj-1', 'org-1', 'instr-1')).rejects.toThrow(
        InstructionNotFoundException,
      );
    });

    it('should return PUBLIC instruction regardless of project/org', async () => {
      const publicInstruction = createTestInstruction({
        visibility: 'PUBLIC',
        projectId: null,
        organizationId: null,
      });
      mockRepository.findById.mockResolvedValue(publicInstruction);

      const result = await service.findById('proj-1', 'org-1', 'instr-1');

      expect(result).toEqual(publicInstruction);
    });
  });

  describe('update', () => {
    it('should partial update an instruction', async () => {
      const instruction = createTestInstruction();
      const updated = createTestInstruction({ description: 'Updated' });
      mockRepository.findById.mockResolvedValue(instruction);
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.update('proj-1', 'org-1', 'instr-1', {
        description: 'Updated',
      });

      expect(result.description).toBe('Updated');
      expect(mockRepository.update).toHaveBeenCalledWith('instr-1', { description: 'Updated' });
    });

    it('should check for duplicates when name is changed', async () => {
      const instruction = createTestInstruction({ name: 'old-name' });
      const existing = createTestInstruction({ id: 'other', name: 'new-name' });
      mockRepository.findById.mockResolvedValue(instruction);
      mockRepository.findByNameAndType.mockResolvedValue(existing);

      await expect(
        service.update('proj-1', 'org-1', 'instr-1', { name: 'new-name' }),
      ).rejects.toThrow(InstructionDuplicateException);
    });

    it('should not check for duplicates when name is unchanged', async () => {
      const instruction = createTestInstruction({ name: 'same-name' });
      const updated = createTestInstruction({ name: 'same-name', description: 'New desc' });
      mockRepository.findById.mockResolvedValue(instruction);
      mockRepository.update.mockResolvedValue(updated);

      await service.update('proj-1', 'org-1', 'instr-1', {
        name: 'same-name',
        description: 'New desc',
      });

      expect(mockRepository.findByNameAndType).not.toHaveBeenCalled();
    });

    it('should throw InstructionNotFoundException for cross-project update', async () => {
      const instruction = createTestInstruction({ projectId: 'proj-2' });
      mockRepository.findById.mockResolvedValue(instruction);

      await expect(
        service.update('proj-1', 'org-1', 'instr-1', { description: 'Hack' }),
      ).rejects.toThrow(InstructionNotFoundException);
    });

    it('should check org-scope duplicates when renaming ORGANIZATION instruction', async () => {
      const orgInstruction = createTestInstruction({
        name: 'old-name',
        visibility: 'ORGANIZATION',
        projectId: null,
        organizationId: 'org-1',
      });
      const existing = createTestInstruction({
        id: 'other',
        name: 'new-name',
        visibility: 'ORGANIZATION',
      });
      mockRepository.findById.mockResolvedValue(orgInstruction);
      mockRepository.findByNameAndTypeForOrganization.mockResolvedValue(existing);

      await expect(
        service.update('proj-1', 'org-1', 'instr-1', { name: 'new-name' }),
      ).rejects.toThrow(InstructionDuplicateException);
    });
  });

  describe('delete', () => {
    it('should delete an instruction', async () => {
      const instruction = createTestInstruction();
      mockRepository.findById.mockResolvedValue(instruction);
      mockRepository.delete.mockResolvedValue(undefined);

      await service.delete('proj-1', 'org-1', 'instr-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('instr-1');
    });

    it('should throw InstructionNotFoundException for cross-project delete', async () => {
      const instruction = createTestInstruction({ projectId: 'proj-2' });
      mockRepository.findById.mockResolvedValue(instruction);

      await expect(service.delete('proj-1', 'org-1', 'instr-1')).rejects.toThrow(
        InstructionNotFoundException,
      );
    });

    it('should allow deleting ORGANIZATION instruction when org matches', async () => {
      const orgInstruction = createTestInstruction({
        visibility: 'ORGANIZATION',
        projectId: null,
        organizationId: 'org-1',
      });
      mockRepository.findById.mockResolvedValue(orgInstruction);
      mockRepository.delete.mockResolvedValue(undefined);

      await service.delete('proj-1', 'org-1', 'instr-1');

      expect(mockRepository.delete).toHaveBeenCalledWith('instr-1');
    });

    it('should reject deleting ORGANIZATION instruction from different org', async () => {
      const orgInstruction = createTestInstruction({
        visibility: 'ORGANIZATION',
        projectId: null,
        organizationId: 'org-2',
      });
      mockRepository.findById.mockResolvedValue(orgInstruction);

      await expect(service.delete('proj-1', 'org-1', 'instr-1')).rejects.toThrow(
        InstructionNotFoundException,
      );
    });
  });

  describe('findMerged', () => {
    const mockAllTiers = (tiers: {
      public?: Instruction[];
      org?: Instruction[];
      private?: Instruction[];
    }) => {
      mockRepository.findPublicByType.mockResolvedValue(tiers.public ?? []);
      mockRepository.findByOrganizationIdAndType.mockResolvedValue(tiers.org ?? []);
      mockRepository.findByProjectIdAndType.mockResolvedValue(tiers.private ?? []);
    };

    it('should return public instructions when no org or private exist', async () => {
      const publicAgents = [
        createTestInstruction({
          id: 'pub-1',
          name: 'developer',
          visibility: 'PUBLIC',
          projectId: null,
          organizationId: null,
        }),
        createTestInstruction({
          id: 'pub-2',
          name: 'architect',
          visibility: 'PUBLIC',
          projectId: null,
          organizationId: null,
        }),
      ];
      mockAllTiers({ public: publicAgents });

      const result = await service.findMerged('proj-1', 'org-1', 'AGENT');

      expect(result).toHaveLength(2);
      expect(result.map((i) => i.name)).toEqual(['developer', 'architect']);
    });

    it('should override public with private when same name', async () => {
      mockAllTiers({
        public: [
          createTestInstruction({
            id: 'pub-1',
            name: 'developer',
            visibility: 'PUBLIC',
            content: 'Public version',
            projectId: null,
            organizationId: null,
          }),
        ],
        private: [
          createTestInstruction({
            id: 'priv-1',
            name: 'developer',
            visibility: 'PRIVATE',
            content: 'Custom version',
            projectId: 'proj-1',
          }),
        ],
      });

      const result = await service.findMerged('proj-1', 'org-1', 'AGENT');

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Custom version');
      expect(result[0].id).toBe('priv-1');
    });

    it('should override public with organization when same name', async () => {
      mockAllTiers({
        public: [
          createTestInstruction({
            id: 'pub-1',
            name: 'developer',
            visibility: 'PUBLIC',
            content: 'Public version',
            projectId: null,
            organizationId: null,
          }),
        ],
        org: [
          createTestInstruction({
            id: 'org-1',
            name: 'developer',
            visibility: 'ORGANIZATION',
            content: 'Org version',
            projectId: null,
            organizationId: 'org-1',
          }),
        ],
      });

      const result = await service.findMerged('proj-1', 'org-1', 'AGENT');

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Org version');
      expect(result[0].visibility).toBe('ORGANIZATION');
    });

    it('should override organization with private when same name', async () => {
      mockAllTiers({
        org: [
          createTestInstruction({
            id: 'org-1',
            name: 'developer',
            visibility: 'ORGANIZATION',
            content: 'Org version',
            projectId: null,
            organizationId: 'org-1',
          }),
        ],
        private: [
          createTestInstruction({
            id: 'priv-1',
            name: 'developer',
            visibility: 'PRIVATE',
            content: 'Private version',
            projectId: 'proj-1',
          }),
        ],
      });

      const result = await service.findMerged('proj-1', 'org-1', 'AGENT');

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Private version');
      expect(result[0].visibility).toBe('PRIVATE');
    });

    it('should cascade: PRIVATE overrides ORG overrides PUBLIC (same name)', async () => {
      mockAllTiers({
        public: [
          createTestInstruction({
            id: 'pub-1',
            name: 'developer',
            visibility: 'PUBLIC',
            content: 'Public version',
            projectId: null,
            organizationId: null,
          }),
        ],
        org: [
          createTestInstruction({
            id: 'org-1',
            name: 'developer',
            visibility: 'ORGANIZATION',
            content: 'Org version',
            projectId: null,
            organizationId: 'org-1',
          }),
        ],
        private: [
          createTestInstruction({
            id: 'priv-1',
            name: 'developer',
            visibility: 'PRIVATE',
            content: 'Private version',
            projectId: 'proj-1',
          }),
        ],
      });

      const result = await service.findMerged('proj-1', 'org-1', 'AGENT');

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Private version');
      expect(result[0].id).toBe('priv-1');
    });

    it('should merge all 3 tiers with unique names', async () => {
      mockAllTiers({
        public: [
          createTestInstruction({
            id: 'pub-1',
            name: 'public-agent',
            visibility: 'PUBLIC',
            projectId: null,
            organizationId: null,
          }),
        ],
        org: [
          createTestInstruction({
            id: 'org-1',
            name: 'org-agent',
            visibility: 'ORGANIZATION',
            projectId: null,
            organizationId: 'org-1',
          }),
        ],
        private: [
          createTestInstruction({
            id: 'priv-1',
            name: 'private-agent',
            visibility: 'PRIVATE',
            projectId: 'proj-1',
          }),
        ],
      });

      const result = await service.findMerged('proj-1', 'org-1', 'AGENT');

      expect(result).toHaveLength(3);
      expect(result.map((i) => i.name).sort()).toEqual([
        'org-agent',
        'private-agent',
        'public-agent',
      ]);
    });

    it('should filter by name when provided', async () => {
      mockAllTiers({
        public: [
          createTestInstruction({
            id: 'pub-1',
            name: 'developer',
            visibility: 'PUBLIC',
            projectId: null,
            organizationId: null,
          }),
          createTestInstruction({
            id: 'pub-2',
            name: 'architect',
            visibility: 'PUBLIC',
            projectId: null,
            organizationId: null,
          }),
        ],
      });

      const result = await service.findMerged('proj-1', 'org-1', 'AGENT', {
        name: 'developer',
      });

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('developer');
    });

    it('should return empty array when name filter has no match', async () => {
      mockAllTiers({});

      const result = await service.findMerged('proj-1', 'org-1', 'AGENT', {
        name: 'nonexistent',
      });

      expect(result).toHaveLength(0);
    });

    it('should fetch all 3 tiers in parallel', async () => {
      mockAllTiers({});

      await service.findMerged('proj-1', 'org-1', 'SKILL');

      expect(mockRepository.findPublicByType).toHaveBeenCalledWith('SKILL');
      expect(mockRepository.findByOrganizationIdAndType).toHaveBeenCalledWith('org-1', 'SKILL');
      expect(mockRepository.findByProjectIdAndType).toHaveBeenCalledWith('proj-1', 'SKILL');
    });

    it('should return only PUBLIC when visibility filter is PUBLIC', async () => {
      const publicAgents = [
        createTestInstruction({
          id: 'pub-1',
          name: 'developer',
          visibility: 'PUBLIC',
          projectId: null,
          organizationId: null,
        }),
      ];
      mockRepository.findPublicByType.mockResolvedValue(publicAgents);

      const result = await service.findMerged('proj-1', 'org-1', 'AGENT', {
        visibility: 'PUBLIC',
      });

      expect(result).toHaveLength(1);
      expect(result[0].visibility).toBe('PUBLIC');
      expect(mockRepository.findByOrganizationIdAndType).not.toHaveBeenCalled();
      expect(mockRepository.findByProjectIdAndType).not.toHaveBeenCalled();
    });

    it('should return only ORGANIZATION when visibility filter is ORGANIZATION', async () => {
      const orgAgents = [
        createTestInstruction({
          id: 'org-1',
          name: 'org-agent',
          visibility: 'ORGANIZATION',
          projectId: null,
          organizationId: 'org-1',
        }),
      ];
      mockRepository.findByOrganizationIdAndType.mockResolvedValue(orgAgents);

      const result = await service.findMerged('proj-1', 'org-1', 'AGENT', {
        visibility: 'ORGANIZATION',
      });

      expect(result).toHaveLength(1);
      expect(result[0].visibility).toBe('ORGANIZATION');
      expect(mockRepository.findPublicByType).not.toHaveBeenCalled();
      expect(mockRepository.findByProjectIdAndType).not.toHaveBeenCalled();
    });

    it('should return only PRIVATE when visibility filter is PRIVATE', async () => {
      const privateAgents = [
        createTestInstruction({
          id: 'priv-1',
          name: 'private-agent',
          visibility: 'PRIVATE',
          projectId: 'proj-1',
        }),
      ];
      mockRepository.findByProjectIdAndType.mockResolvedValue(privateAgents);

      const result = await service.findMerged('proj-1', 'org-1', 'AGENT', {
        visibility: 'PRIVATE',
      });

      expect(result).toHaveLength(1);
      expect(result[0].visibility).toBe('PRIVATE');
      expect(mockRepository.findPublicByType).not.toHaveBeenCalled();
      expect(mockRepository.findByOrganizationIdAndType).not.toHaveBeenCalled();
    });
  });

  describe('searchMerged', () => {
    const setupSearchInstructions = () => {
      const agent1 = createTestInstruction({
        id: 'a1',
        name: 'architect',
        type: 'AGENT',
        description: 'System architect for Clean Architecture',
        content: '# Architect\n\nYou design systems.',
        visibility: 'PUBLIC',
        projectId: null,
        organizationId: null,
      });
      const agent2 = createTestInstruction({
        id: 'a2',
        name: 'developer',
        type: 'AGENT',
        description: 'Full-stack developer',
        content: '# Developer\n\nYou write clean code following architecture patterns.',
        visibility: 'PUBLIC',
        projectId: null,
        organizationId: null,
      });
      const command1 = createTestInstruction({
        id: 'c1',
        name: 'code-review',
        type: 'COMMAND',
        description: 'Code review checklist',
        content: '# Code Review\n\nReview code for architecture compliance.',
        visibility: 'PUBLIC',
        projectId: null,
        organizationId: null,
      });
      const skill1 = createTestInstruction({
        id: 's1',
        name: 'backend-patterns',
        type: 'SKILL',
        description: 'NestJS patterns and conventions',
        content: '# Backend Patterns\n\nFollow these patterns.',
        visibility: 'PUBLIC',
        projectId: null,
        organizationId: null,
      });

      return { agent1, agent2, command1, skill1 };
    };

    const mockAllTypes = (instructions: {
      AGENT?: Instruction[];
      COMMAND?: Instruction[];
      MEMORY?: Instruction[];
      SKILL?: Instruction[];
    }) => {
      mockRepository.findPublicByType.mockImplementation((type: string) => {
        return Promise.resolve(instructions[type as keyof typeof instructions] ?? []);
      });
      mockRepository.findByOrganizationIdAndType.mockResolvedValue([]);
      mockRepository.findByProjectIdAndType.mockResolvedValue([]);
    };

    it('should match instructions by keyword in name', async () => {
      const { agent1, agent2, command1, skill1 } = setupSearchInstructions();
      mockAllTypes({ AGENT: [agent1, agent2], COMMAND: [command1], SKILL: [skill1] });

      const result = await service.searchMerged('proj-1', 'org-1', 'architect');

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].name).toBe('architect');
      expect(result.results[0].score).toBeGreaterThan(0);
      expect(result.query).toBe('architect');
    });

    it('should return results without content body', async () => {
      const { agent1 } = setupSearchInstructions();
      mockAllTypes({ AGENT: [agent1] });

      const result = await service.searchMerged('proj-1', 'org-1', 'architect');

      const firstResult = result.results[0];
      expect(firstResult).toHaveProperty('name');
      expect(firstResult).toHaveProperty('type');
      expect(firstResult).toHaveProperty('visibility');
      expect(firstResult).toHaveProperty('description');
      expect(firstResult).toHaveProperty('score');
      expect(firstResult).not.toHaveProperty('content');
    });

    it('should include visibility in search results', async () => {
      const { agent1 } = setupSearchInstructions();
      mockAllTypes({ AGENT: [agent1] });

      const result = await service.searchMerged('proj-1', 'org-1', 'architect');

      expect(result.results[0].visibility).toBe('PUBLIC');
    });

    it('should score name matches higher than content-only matches', async () => {
      const { agent1, agent2 } = setupSearchInstructions();
      // "architect" appears in agent1 name + description + content, in agent2 only in content
      mockAllTypes({ AGENT: [agent1, agent2] });

      const result = await service.searchMerged('proj-1', 'org-1', 'architect');

      const architectResult = result.results.find((r) => r.name === 'architect');
      const developerResult = result.results.find((r) => r.name === 'developer');

      expect(architectResult).toBeDefined();
      expect(developerResult).toBeDefined();
      expect(architectResult!.score).toBeGreaterThan(developerResult!.score);
    });

    it('should handle multi-term queries', async () => {
      const { agent1, agent2 } = setupSearchInstructions();
      mockAllTypes({ AGENT: [agent1, agent2] });

      const result = await service.searchMerged('proj-1', 'org-1', 'clean architecture');

      expect(result.results.length).toBeGreaterThan(0);
      const scores = result.results.map((r) => r.score);
      expect(scores.every((s) => s > 0)).toBe(true);
    });

    it('should filter by type when provided', async () => {
      const { agent1, agent2, command1 } = setupSearchInstructions();
      mockAllTypes({ AGENT: [agent1, agent2], COMMAND: [command1] });

      const result = await service.searchMerged('proj-1', 'org-1', 'code', { type: 'COMMAND' });

      expect(result.results.every((r) => r.type === 'COMMAND')).toBe(true);
      // Should only query COMMAND type
      expect(mockRepository.findPublicByType).toHaveBeenCalledTimes(1);
      expect(mockRepository.findPublicByType).toHaveBeenCalledWith('COMMAND');
    });

    it('should search all types when no type filter', async () => {
      const { agent1, agent2, command1, skill1 } = setupSearchInstructions();
      mockAllTypes({ AGENT: [agent1, agent2], COMMAND: [command1], SKILL: [skill1] });

      const result = await service.searchMerged('proj-1', 'org-1', 'patterns');

      // Should query all 5 types
      expect(mockRepository.findPublicByType).toHaveBeenCalledTimes(5);
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should enforce limit', async () => {
      const { agent1, agent2, command1, skill1 } = setupSearchInstructions();
      mockAllTypes({ AGENT: [agent1, agent2], COMMAND: [command1], SKILL: [skill1] });

      const result = await service.searchMerged('proj-1', 'org-1', 'architect code patterns', {
        limit: 2,
      });

      expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it('should return empty results for no matches', async () => {
      mockAllTypes({});

      const result = await service.searchMerged('proj-1', 'org-1', 'xyznonexistent');

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.query).toBe('xyznonexistent');
    });

    it('should return empty results for whitespace-only query', async () => {
      const { agent1 } = setupSearchInstructions();
      mockAllTypes({ AGENT: [agent1] });

      const result = await service.searchMerged('proj-1', 'org-1', '   ');

      expect(result.results).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should be case insensitive', async () => {
      const { agent1 } = setupSearchInstructions();
      mockAllTypes({ AGENT: [agent1] });

      const upper = await service.searchMerged('proj-1', 'org-1', 'ARCHITECT');
      const lower = await service.searchMerged('proj-1', 'org-1', 'architect');
      const mixed = await service.searchMerged('proj-1', 'org-1', 'Architect');

      expect(upper.results.length).toBe(lower.results.length);
      expect(upper.results.length).toBe(mixed.results.length);
      expect(upper.results[0]?.score).toBe(lower.results[0]?.score);
    });

    it('should use private overrides in search results', async () => {
      const publicAgent = createTestInstruction({
        id: 'pub-1',
        name: 'architect',
        type: 'AGENT',
        description: 'Public architect',
        content: '# Public Architect',
        visibility: 'PUBLIC',
        projectId: null,
        organizationId: null,
      });
      const privateAgent = createTestInstruction({
        id: 'priv-1',
        name: 'architect',
        type: 'AGENT',
        description: 'Custom architect for our project',
        content: '# Custom Architect',
        visibility: 'PRIVATE',
        projectId: 'proj-1',
      });

      mockRepository.findPublicByType.mockImplementation((type: string) => {
        if (type === 'AGENT') return Promise.resolve([publicAgent]);
        return Promise.resolve([]);
      });
      mockRepository.findByOrganizationIdAndType.mockResolvedValue([]);
      mockRepository.findByProjectIdAndType.mockImplementation((_pid: string, type: string) => {
        if (type === 'AGENT') return Promise.resolve([privateAgent]);
        return Promise.resolve([]);
      });

      const result = await service.searchMerged('proj-1', 'org-1', 'architect');

      const architectResults = result.results.filter((r) => r.name === 'architect');
      expect(architectResults).toHaveLength(1);
      expect(architectResults[0].description).toBe('Custom architect for our project');
    });

    it('should include ORG instructions in search results', async () => {
      const orgAgent = createTestInstruction({
        id: 'org-1',
        name: 'org-architect',
        type: 'AGENT',
        description: 'Organization architect',
        content: '# Org Architect',
        visibility: 'ORGANIZATION',
        projectId: null,
        organizationId: 'org-1',
      });

      mockRepository.findPublicByType.mockResolvedValue([]);
      mockRepository.findByOrganizationIdAndType.mockImplementation(
        (_oid: string, type: string) => {
          if (type === 'AGENT') return Promise.resolve([orgAgent]);
          return Promise.resolve([]);
        },
      );
      mockRepository.findByProjectIdAndType.mockResolvedValue([]);

      const result = await service.searchMerged('proj-1', 'org-1', 'architect');

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].name).toBe('org-architect');
      expect(result.results[0].visibility).toBe('ORGANIZATION');
    });

    it('should filter search by visibility', async () => {
      const orgAgent = createTestInstruction({
        id: 'org-1',
        name: 'org-architect',
        type: 'AGENT',
        description: 'Organization architect',
        content: '# Org Architect',
        visibility: 'ORGANIZATION',
        projectId: null,
        organizationId: 'org-1',
      });
      mockRepository.findByOrganizationIdAndType.mockImplementation(
        (_oid: string, type: string) => {
          if (type === 'AGENT') return Promise.resolve([orgAgent]);
          return Promise.resolve([]);
        },
      );

      const result = await service.searchMerged('proj-1', 'org-1', 'architect', {
        visibility: 'ORGANIZATION',
      });

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results.every((r) => r.visibility === 'ORGANIZATION')).toBe(true);
      expect(mockRepository.findPublicByType).not.toHaveBeenCalled();
      expect(mockRepository.findByProjectIdAndType).not.toHaveBeenCalled();
    });

    it('should sort by score descending', async () => {
      const { agent1, agent2, command1 } = setupSearchInstructions();
      mockAllTypes({ AGENT: [agent1, agent2], COMMAND: [command1] });

      const result = await service.searchMerged('proj-1', 'org-1', 'architecture');

      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].score).toBeGreaterThanOrEqual(result.results[i].score);
      }
    });

    it('should use default limit of 10', async () => {
      const instructions = Array.from({ length: 15 }, (_, i) =>
        createTestInstruction({
          id: `a${i}`,
          name: `agent-${i}`,
          type: 'AGENT',
          description: 'Matching description with keyword test',
          content: 'Content with keyword test',
          visibility: 'PUBLIC',
          projectId: null,
          organizationId: null,
        }),
      );
      mockAllTypes({ AGENT: instructions });

      const result = await service.searchMerged('proj-1', 'org-1', 'test');

      expect(result.results.length).toBeLessThanOrEqual(10);
    });
  });

  describe('upsertMemory', () => {
    it('should create new PRIVATE MEMORY entry when name does not exist', async () => {
      mockRepository.findByNameAndType.mockResolvedValue(null);
      const created = createTestInstruction({
        type: 'MEMORY',
        visibility: 'PRIVATE',
        name: 'conventions',
        content: '# Conventions',
      });
      mockRepository.create.mockResolvedValue(created);

      const result = await service.upsertMemory('proj-1', 'org-1', 'conventions', '# Conventions');

      expect(result.created).toBe(true);
      expect(result.instruction).toEqual(created);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'conventions',
          type: 'MEMORY',
          visibility: 'PRIVATE',
          description: MEMORY_DEFAULT_DESCRIPTION,
          content: '# Conventions',
          projectId: 'proj-1',
          organizationId: 'org-1',
        }),
      );
    });

    it('should update content when name already exists for same project', async () => {
      const existing = createTestInstruction({
        id: 'mem-1',
        type: 'MEMORY',
        visibility: 'PRIVATE',
        name: 'conventions',
        content: '# Old',
      });
      mockRepository.findByNameAndType.mockResolvedValue(existing);
      const updated = createTestInstruction({
        ...existing,
        content: '# Updated',
      });
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.upsertMemory('proj-1', 'org-1', 'conventions', '# Updated');

      expect(result.created).toBe(false);
      expect(result.instruction.content).toBe('# Updated');
      expect(mockRepository.update).toHaveBeenCalledWith('mem-1', { content: '# Updated' });
    });

    it('should always use type=MEMORY and visibility=PRIVATE', async () => {
      mockRepository.findByNameAndType.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(
        createTestInstruction({ type: 'MEMORY', visibility: 'PRIVATE' }),
      );

      await service.upsertMemory('proj-1', 'org-1', 'test', 'content');

      expect(mockRepository.findByNameAndType).toHaveBeenCalledWith('test', 'MEMORY', 'proj-1');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'MEMORY',
          visibility: 'PRIVATE',
        }),
      );
    });

    it('should set projectId and organizationId correctly', async () => {
      mockRepository.findByNameAndType.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(createTestInstruction());

      await service.upsertMemory('proj-99', 'org-42', 'test', 'content');

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-99',
          organizationId: 'org-42',
        }),
      );
    });
  });

  describe('replaceMemoryContent', () => {
    it('should replace old_str with new_str when exactly one match', async () => {
      const existing = createTestInstruction({
        id: 'mem-1',
        type: 'MEMORY',
        name: 'conventions',
        content: '# Conventions\n- Use pnpm\n- Follow Clean Architecture',
      });
      mockRepository.findByNameAndType.mockResolvedValue(existing);
      const updated = createTestInstruction({
        ...existing,
        content: '# Conventions\n- Use pnpm\n- Follow Clean Architecture\n- Write tests',
      });
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.replaceMemoryContent(
        'proj-1',
        'conventions',
        '- Follow Clean Architecture',
        '- Follow Clean Architecture\n- Write tests',
      );

      expect(result.content).toContain('- Write tests');
      expect(mockRepository.update).toHaveBeenCalledWith('mem-1', {
        content: '# Conventions\n- Use pnpm\n- Follow Clean Architecture\n- Write tests',
      });
    });

    it('should throw MemoryEntryNotFoundException when entry not found', async () => {
      mockRepository.findByNameAndType.mockResolvedValue(null);

      await expect(
        service.replaceMemoryContent('proj-1', 'nonexistent', 'old', 'new'),
      ).rejects.toThrow(MemoryEntryNotFoundException);
    });

    it('should throw MemoryContentReplaceException when old_str not found in content', async () => {
      const existing = createTestInstruction({
        type: 'MEMORY',
        name: 'conventions',
        content: '# Conventions\n- Use pnpm',
      });
      mockRepository.findByNameAndType.mockResolvedValue(existing);

      await expect(
        service.replaceMemoryContent('proj-1', 'conventions', 'nonexistent text', 'replacement'),
      ).rejects.toThrow(MemoryContentReplaceException);
    });

    it('should throw MemoryContentReplaceException when old_str matches multiple times', async () => {
      const existing = createTestInstruction({
        type: 'MEMORY',
        name: 'conventions',
        content: '# Conventions\n- Use pnpm\n- Use pnpm always',
      });
      mockRepository.findByNameAndType.mockResolvedValue(existing);

      await expect(
        service.replaceMemoryContent('proj-1', 'conventions', 'Use pnpm', 'Use bun'),
      ).rejects.toThrow(MemoryContentReplaceException);
    });

    it('should handle special regex characters in old_str safely', async () => {
      const existing = createTestInstruction({
        type: 'MEMORY',
        name: 'conventions',
        content: 'Use pattern: foo.*bar (required)',
      });
      mockRepository.findByNameAndType.mockResolvedValue(existing);
      const updated = createTestInstruction({
        ...existing,
        content: 'Use pattern: baz.*qux (required)',
      });
      mockRepository.update.mockResolvedValue(updated);

      const result = await service.replaceMemoryContent(
        'proj-1',
        'conventions',
        'foo.*bar',
        'baz.*qux',
      );

      expect(result.content).toContain('baz.*qux');
    });
  });

  describe('deleteMemoryByName', () => {
    it('should delete entry when found', async () => {
      const existing = createTestInstruction({
        id: 'mem-1',
        type: 'MEMORY',
        name: 'conventions',
      });
      mockRepository.findByNameAndType.mockResolvedValue(existing);
      mockRepository.delete.mockResolvedValue(undefined);

      await service.deleteMemoryByName('proj-1', 'conventions');

      expect(mockRepository.delete).toHaveBeenCalledWith('mem-1');
    });

    it('should throw MemoryEntryNotFoundException when entry not found', async () => {
      mockRepository.findByNameAndType.mockResolvedValue(null);

      await expect(service.deleteMemoryByName('proj-1', 'nonexistent')).rejects.toThrow(
        MemoryEntryNotFoundException,
      );
    });
  });

  describe('audit logging', () => {
    it('should log INSTRUCTION_CREATED on create (PRIVATE)', async () => {
      mockRepository.findByNameAndType.mockResolvedValue(null);
      const created = createTestInstruction();
      mockRepository.create.mockResolvedValue(created);

      await service.create('proj-1', 'org-1', {
        name: 'test-agent',
        type: 'AGENT',
        description: 'Test',
        content: '# Test',
      });

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.INSTRUCTION_CREATED,
          metadata: expect.objectContaining({
            name: 'test-agent',
            type: 'AGENT',
            visibility: 'PRIVATE',
          }),
        }),
      );
    });

    it('should log INSTRUCTION_CREATED on create (ORGANIZATION)', async () => {
      mockRepository.findByNameAndTypeForOrganization.mockResolvedValue(null);
      const created = createTestInstruction({ visibility: 'ORGANIZATION', projectId: null });
      mockRepository.create.mockResolvedValue(created);

      await service.create('proj-1', 'org-1', {
        name: 'test-agent',
        type: 'AGENT',
        description: 'Org',
        content: '# Org',
        visibility: 'ORGANIZATION',
      });

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.INSTRUCTION_CREATED,
          metadata: expect.objectContaining({ visibility: 'ORGANIZATION' }),
        }),
      );
    });

    it('should log INSTRUCTION_UPDATED on update', async () => {
      const instruction = createTestInstruction();
      const updated = createTestInstruction({ description: 'Updated' });
      mockRepository.findById.mockResolvedValue(instruction);
      mockRepository.update.mockResolvedValue(updated);

      await service.update('proj-1', 'org-1', 'instr-1', { description: 'Updated' });

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.INSTRUCTION_UPDATED,
          resourceId: 'instr-1',
        }),
      );
    });

    it('should log INSTRUCTION_DELETED on delete', async () => {
      const instruction = createTestInstruction();
      mockRepository.findById.mockResolvedValue(instruction);
      mockRepository.delete.mockResolvedValue(undefined);

      await service.delete('proj-1', 'org-1', 'instr-1');

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.INSTRUCTION_DELETED,
          resourceId: 'instr-1',
        }),
      );
    });

    it('should log INSTRUCTION_CREATED on upsertMemory (new)', async () => {
      mockRepository.findByNameAndType.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(createTestInstruction({ type: 'MEMORY' }));

      await service.upsertMemory('proj-1', 'org-1', 'test', 'content');

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.INSTRUCTION_CREATED,
          metadata: expect.objectContaining({ type: 'MEMORY' }),
        }),
      );
    });

    it('should log INSTRUCTION_UPDATED on upsertMemory (existing)', async () => {
      const existing = createTestInstruction({ id: 'mem-1', type: 'MEMORY' });
      mockRepository.findByNameAndType.mockResolvedValue(existing);
      mockRepository.update.mockResolvedValue(existing);

      await service.upsertMemory('proj-1', 'org-1', 'test', 'updated');

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.INSTRUCTION_UPDATED,
          metadata: expect.objectContaining({ type: 'MEMORY' }),
        }),
      );
    });

    it('should log INSTRUCTION_DELETED on deleteMemoryByName', async () => {
      const existing = createTestInstruction({ id: 'mem-1', type: 'MEMORY', name: 'test' });
      mockRepository.findByNameAndType.mockResolvedValue(existing);
      mockRepository.delete.mockResolvedValue(undefined);

      await service.deleteMemoryByName('proj-1', 'test');

      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AuditAction.INSTRUCTION_DELETED,
          metadata: expect.objectContaining({ type: 'MEMORY' }),
        }),
      );
    });

    it('should not throw when audit service is undefined', async () => {
      // Create service without audit service
      const serviceWithoutAudit = new InstructionService(
        mockRepository as unknown as IInstructionRepository,
      );
      mockRepository.findByNameAndType.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(createTestInstruction());

      await expect(
        serviceWithoutAudit.create('proj-1', 'org-1', {
          name: 'test',
          type: 'AGENT',
          description: 'Test',
          content: '# Test',
        }),
      ).resolves.toBeDefined();
    });
  });
});
