import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstructionBackfillService } from '@/application/embedding/services/instruction-backfill.service';
import { InstructionEmbeddingService } from '@/application/embedding/services/instruction-embedding.service';
import { IInstructionRepository } from '@/core/interfaces/repositories/instruction.repository.interface';
import { IInstructionEmbeddingRepository } from '@/core/interfaces/repositories/instruction-embedding.repository.interface';
import { IStructuredLogger } from '@/core/interfaces/services/observability.interface';
import { ConfigService } from '@nestjs/config';
import type { Instruction } from '@/core/entities/instruction.entity';

const createTestInstruction = (overrides: Partial<Instruction> = {}): Instruction => ({
  id: 'instr-1',
  name: 'test-agent',
  type: 'AGENT',
  visibility: 'PUBLIC',
  description: 'A test agent',
  content: '# Test Agent',
  metadata: {},
  projectId: null,
  organizationId: null,
  createdAt: new Date('2026-01-15T10:00:00.000Z'),
  updatedAt: new Date('2026-01-15T10:00:00.000Z'),
  ...overrides,
});

describe('InstructionBackfillService', () => {
  let service: InstructionBackfillService;
  let instructionRepository: IInstructionRepository;
  let embeddingRepository: IInstructionEmbeddingRepository;
  let logger: IStructuredLogger;
  let embeddingService: InstructionEmbeddingService;
  let configService: ConfigService;

  const mockInstructions: Instruction[] = [
    createTestInstruction({ id: 'instr-1', name: 'agent-1', projectId: 'proj-1' }),
    createTestInstruction({ id: 'instr-2', name: 'agent-2', projectId: 'proj-1' }),
  ];

  beforeEach(() => {
    instructionRepository = {
      findByProjectId: vi.fn().mockResolvedValue(mockInstructions),
      findById: vi.fn(),
      findPublicByType: vi.fn().mockResolvedValue([]),
      findByProjectIdAndType: vi.fn().mockResolvedValue(mockInstructions),
      findByOrganizationIdAndType: vi.fn().mockResolvedValue([]),
      findByNameAndType: vi.fn(),
      findByNameAndTypeForOrganization: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    embeddingRepository = {
      upsert: vi.fn(),
      findByInstructionId: vi.fn(),
      findSimilar: vi.fn(),
      deleteByInstructionId: vi.fn(),
      findInstructionsNeedingEmbedding: vi.fn().mockResolvedValue([
        { id: 'instr-1', contentHash: null },
        { id: 'instr-2', contentHash: null },
      ]),
      isPgvectorAvailable: vi.fn(),
    };

    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    embeddingService = {
      embedInstruction: vi.fn().mockResolvedValue({
        success: true,
        instructionId: 'instr-1',
        action: 'created',
        tokensUsed: 100,
      }),
      shouldEmbed: vi.fn().mockResolvedValue(true),
      deleteEmbedding: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(true),
    } as unknown as InstructionEmbeddingService;

    configService = {
      get: vi.fn((key: string) => {
        if (key === 'embedding.maxBatchSize') return 100;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new InstructionBackfillService(
      instructionRepository,
      embeddingRepository,
      logger,
      embeddingService,
      configService,
    );
  });

  describe('backfill', () => {
    it('should process all instructions needing embeddings', async () => {
      const result = await service.backfill({
        projectId: 'proj-1',
        organizationId: 'org-1',
      });

      expect(result.total).toBe(2);
      expect(result.embedded).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(embeddingService.embedInstruction).toHaveBeenCalledTimes(2);
    });

    it('should return dry run estimate without processing', async () => {
      const result = await service.backfill({
        projectId: 'proj-1',
        organizationId: 'org-1',
        dryRun: true,
      });

      expect(result.total).toBe(2);
      expect(result.embedded).toBe(0);
      expect(result.estimatedCostUsd).toBeGreaterThan(0);
      expect(embeddingService.embedInstruction).not.toHaveBeenCalled();
    });

    it('should force regenerate all when flag is set', async () => {
      const result = await service.backfill({
        projectId: 'proj-1',
        organizationId: 'org-1',
        forceRegenerate: true,
      });

      expect(result.embedded).toBe(2);
      expect(embeddingRepository.findInstructionsNeedingEmbedding).not.toHaveBeenCalled();
    });

    it('should skip instructions that do not need embedding', async () => {
      vi.mocked(embeddingService.embedInstruction).mockResolvedValue({
        success: true,
        instructionId: 'instr-1',
        action: 'skipped',
      });

      const result = await service.backfill({
        projectId: 'proj-1',
        organizationId: 'org-1',
      });

      expect(result.skipped).toBe(2);
      expect(result.embedded).toBe(0);
    });

    it('should handle embedding failures gracefully', async () => {
      vi.mocked(embeddingService.embedInstruction)
        .mockResolvedValueOnce({
          success: true,
          instructionId: 'instr-1',
          action: 'created',
          tokensUsed: 100,
        })
        .mockResolvedValueOnce({
          success: false,
          instructionId: 'instr-2',
          action: 'failed',
          error: 'API error',
        });

      const result = await service.backfill({
        projectId: 'proj-1',
        organizationId: 'org-1',
      });

      expect(result.embedded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].instructionId).toBe('instr-2');
    });

    it('should call progress callback', async () => {
      const progressCallback = vi.fn();

      await service.backfill(
        {
          projectId: 'proj-1',
          organizationId: 'org-1',
          batchSize: 1,
        },
        progressCallback,
      );

      expect(progressCallback).toHaveBeenCalled();
    });

    it('should filter by type when provided', async () => {
      await service.backfill({
        projectId: 'proj-1',
        organizationId: 'org-1',
        type: 'AGENT',
      });

      expect(instructionRepository.findByProjectIdAndType).toHaveBeenCalledWith('proj-1', 'AGENT');
    });
  });
});
