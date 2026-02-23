import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstructionSearchService } from '@/application/embedding/services/instruction-search.service';
import { IEmbeddingProvider } from '@/core/interfaces/services/embedding-provider.interface';
import { IInstructionEmbeddingRepository } from '@/core/interfaces/repositories/instruction-embedding.repository.interface';
import { IStructuredLogger } from '@/core/interfaces/services/observability.interface';
import { ConfigService } from '@nestjs/config';
import type { Instruction } from '@/core/entities/instruction.entity';

const createTestInstruction = (overrides: Partial<Instruction> = {}): Instruction => ({
  id: 'instr-1',
  name: 'test-agent',
  type: 'AGENT',
  visibility: 'PUBLIC',
  description: 'A test agent for development',
  content: '# Test Agent\n\nYou help developers write code.',
  metadata: {},
  projectId: null,
  organizationId: null,
  createdAt: new Date('2026-01-15T10:00:00.000Z'),
  updatedAt: new Date('2026-01-15T10:00:00.000Z'),
  ...overrides,
});

describe('InstructionSearchService', () => {
  let service: InstructionSearchService;
  let embeddingProvider: IEmbeddingProvider;
  let embeddingRepository: IInstructionEmbeddingRepository;
  let logger: IStructuredLogger;
  let configService: ConfigService;

  const mockEmbedding = new Array(1536).fill(0.1);

  beforeEach(() => {
    embeddingProvider = {
      name: 'stub',
      dimensions: 1536,
      embed: vi.fn().mockResolvedValue({
        vector: mockEmbedding,
        usage: { totalTokens: 50 },
        model: 'text-embedding-3-small',
      }),
      embedBatch: vi.fn(),
      healthCheck: vi.fn().mockResolvedValue(true),
    };

    embeddingRepository = {
      upsert: vi.fn(),
      findByInstructionId: vi.fn(),
      findSimilar: vi.fn().mockResolvedValue([
        { instructionId: 'instr-1', similarity: 0.92 },
        { instructionId: 'instr-2', similarity: 0.85 },
      ]),
      deleteByInstructionId: vi.fn(),
      findInstructionsNeedingEmbedding: vi.fn(),
      isPgvectorAvailable: vi.fn().mockResolvedValue(true),
    };

    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    configService = {
      get: vi.fn((key: string) => {
        if (key === 'embedding.enabled') return true;
        if (key === 'embedding.topK') return 10;
        if (key === 'embedding.hybridWeight') return 0.7;
        if (key === 'embedding.minScore') return 0.35;
        if (key === 'embedding.similarityFloor') return 0.3;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new InstructionSearchService(
      embeddingProvider,
      embeddingRepository,
      logger,
      configService,
    );
  });

  describe('search', () => {
    it('should perform hybrid search combining semantic and keyword results', async () => {
      const candidates = [
        createTestInstruction({
          id: 'instr-1',
          name: 'architect',
          description: 'System architect',
        }),
        createTestInstruction({
          id: 'instr-2',
          name: 'developer',
          description: 'Full-stack developer',
        }),
      ];

      const result = await service.search(candidates, 'architect');

      expect(result.fallbackUsed).toBe(false);
      expect(result.embeddingTokensUsed).toBe(50);
      expect(result.results.length).toBeGreaterThan(0);
      expect(embeddingProvider.embed).toHaveBeenCalledWith('architect');
      expect(embeddingRepository.findSimilar).toHaveBeenCalled();
    });

    it('should identify hybrid matches correctly', async () => {
      const candidates = [
        createTestInstruction({
          id: 'instr-1',
          name: 'architect',
          description: 'System architect for designing systems',
        }),
        createTestInstruction({
          id: 'instr-2',
          name: 'developer',
          description: 'Architect-aware developer',
        }),
      ];

      const result = await service.search(candidates, 'architect');

      // instr-2 appears in both semantic and keyword results
      const instr2Result = result.results.find((r) => r.instruction.id === 'instr-2');
      expect(instr2Result?.matchType).toBe('hybrid');
    });

    it('should return empty results for empty candidates', async () => {
      const result = await service.search([], 'test query');

      expect(result.results).toHaveLength(0);
      expect(result.fallbackUsed).toBe(false);
      expect(result.embeddingTokensUsed).toBe(0);
    });

    it('should respect topK limit', async () => {
      const candidates = [
        createTestInstruction({ id: 'instr-1', name: 'a1', description: 'test item' }),
        createTestInstruction({ id: 'instr-2', name: 'a2', description: 'test item' }),
        createTestInstruction({ id: 'instr-3', name: 'a3', description: 'test item' }),
      ];

      vi.mocked(embeddingRepository.findSimilar).mockResolvedValue([
        { instructionId: 'instr-1', similarity: 0.9 },
        { instructionId: 'instr-2', similarity: 0.8 },
        { instructionId: 'instr-3', similarity: 0.7 },
      ]);

      const result = await service.search(candidates, 'test', { topK: 1 });
      expect(result.results.length).toBeLessThanOrEqual(1);
    });

    it('should continue with keyword-only on semantic failure', async () => {
      vi.mocked(embeddingProvider.embed).mockRejectedValue(new Error('API error'));

      const candidates = [
        createTestInstruction({
          id: 'instr-1',
          name: 'architect',
          description: 'System architect',
        }),
      ];

      const result = await service.search(candidates, 'architect');

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.embeddingTokensUsed).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
    });

    it('should apply correct hybrid weights', async () => {
      const candidates = [
        createTestInstruction({
          id: 'instr-1',
          name: 'architect',
          description: 'System architect',
          content: 'Designs architecture',
        }),
      ];

      vi.mocked(embeddingRepository.findSimilar).mockResolvedValue([
        { instructionId: 'instr-1', similarity: 0.9 },
      ]);

      const result = await service.search(candidates, 'architect', { semanticWeight: 0.7 });

      const firstResult = result.results[0];
      expect(firstResult.semanticScore).toBeDefined();
      expect(firstResult.keywordScore).toBeDefined();
      expect(firstResult.combinedScore).toBeGreaterThan(0);
    });

    it('should sort results by combined score descending', async () => {
      const candidates = [
        createTestInstruction({ id: 'instr-1', name: 'low', description: 'Unrelated' }),
        createTestInstruction({
          id: 'instr-2',
          name: 'high',
          description: 'Highly relevant query match',
        }),
      ];

      vi.mocked(embeddingRepository.findSimilar).mockResolvedValue([
        { instructionId: 'instr-2', similarity: 0.95 },
        { instructionId: 'instr-1', similarity: 0.3 },
      ]);

      const result = await service.search(candidates, 'query');

      for (let i = 1; i < result.results.length; i++) {
        expect(result.results[i - 1].combinedScore).toBeGreaterThanOrEqual(
          result.results[i].combinedScore,
        );
      }
    });

    it('should filter out low-similarity results below minimum score threshold', async () => {
      const candidates = [
        createTestInstruction({ id: 'instr-1', name: 'noise', description: 'Unrelated content' }),
      ];

      // similarity -0.2 → floor-normalized max(0, (-0.2-0.3)/(1-0.3)) = 0 → combined 0*0.7 = 0 < 0.35
      vi.mocked(embeddingRepository.findSimilar).mockResolvedValue([
        { instructionId: 'instr-1', similarity: -0.2 },
      ]);

      const result = await service.search(candidates, 'xyz nonexistent gibberish');

      expect(result.results).toHaveLength(0);
      expect(result.embeddingTokensUsed).toBe(50);
    });

    it('should retain high-similarity results above minimum score threshold', async () => {
      const candidates = [
        createTestInstruction({
          id: 'instr-1',
          name: 'relevant',
          description: 'Highly relevant match',
        }),
      ];

      // similarity 0.9 → floor-normalized (0.9-0.3)/(1-0.3) = 0.857 → combined 0.857*0.7 = 0.6 > 0.35
      vi.mocked(embeddingRepository.findSimilar).mockResolvedValue([
        { instructionId: 'instr-1', similarity: 0.9 },
      ]);

      const result = await service.search(candidates, 'relevant');

      expect(result.results).toHaveLength(1);
      expect(result.results[0].combinedScore).toBeGreaterThanOrEqual(0.35);
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      expect(service.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      const disabledConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'embedding.enabled') return false;
          return undefined;
        }),
      } as unknown as ConfigService;

      const disabledService = new InstructionSearchService(
        embeddingProvider,
        embeddingRepository,
        logger,
        disabledConfigService,
      );

      expect(disabledService.isEnabled()).toBe(false);
    });
  });
});
