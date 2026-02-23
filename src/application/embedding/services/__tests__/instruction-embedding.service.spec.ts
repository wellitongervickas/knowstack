import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InstructionEmbeddingService } from '@/application/embedding/services/instruction-embedding.service';
import { IEmbeddingProvider } from '@/core/interfaces/services/embedding-provider.interface';
import { IInstructionEmbeddingRepository } from '@/core/interfaces/repositories/instruction-embedding.repository.interface';
import { IStructuredLogger } from '@/core/interfaces/services/observability.interface';
import { ConfigService } from '@nestjs/config';

describe('InstructionEmbeddingService', () => {
  let service: InstructionEmbeddingService;
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
        usage: { totalTokens: 100 },
        model: 'text-embedding-3-small',
      }),
      embedBatch: vi.fn(),
      healthCheck: vi.fn().mockResolvedValue(true),
    };

    embeddingRepository = {
      upsert: vi.fn().mockResolvedValue({
        id: 'emb-1',
        instructionId: 'instr-1',
        projectId: 'proj-1',
        organizationId: 'org-1',
        embedding: mockEmbedding,
        contentHash: 'hash-1',
        model: 'text-embedding-3-small',
        inputTokens: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findByInstructionId: vi.fn().mockResolvedValue(null),
      findSimilar: vi.fn().mockResolvedValue([]),
      deleteByInstructionId: vi.fn(),
      findInstructionsNeedingEmbedding: vi.fn().mockResolvedValue([]),
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
        if (key === 'embedding.openai.maxTokens') return 8191;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new InstructionEmbeddingService(
      embeddingProvider,
      embeddingRepository,
      logger,
      configService,
    );
  });

  describe('embedInstruction', () => {
    it('should create embedding for new instruction', async () => {
      const result = await service.embedInstruction({
        instructionId: 'instr-1',
        projectId: 'proj-1',
        organizationId: 'org-1',
        name: 'test-agent',
        description: 'A test agent',
        content: '# Test Agent',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.tokensUsed).toBe(100);
      expect(embeddingProvider.embed).toHaveBeenCalled();
      expect(embeddingRepository.upsert).toHaveBeenCalled();
    });

    it('should skip embedding when content hash matches', async () => {
      const input = {
        instructionId: 'instr-1',
        projectId: 'proj-1',
        organizationId: 'org-1',
        name: 'test-agent',
        description: 'A test agent',
        content: '# Test Agent',
      };

      // First call to get the hash
      await service.embedInstruction(input);
      const upsertCall = vi.mocked(embeddingRepository.upsert).mock.calls[0][0];
      const contentHash = upsertCall.contentHash;

      // Mock existing embedding with matching hash
      vi.mocked(embeddingRepository.findByInstructionId).mockResolvedValue({
        id: 'emb-1',
        instructionId: 'instr-1',
        projectId: 'proj-1',
        organizationId: 'org-1',
        embedding: mockEmbedding,
        contentHash,
        model: 'text-embedding-3-small',
        inputTokens: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.mocked(embeddingProvider.embed).mockClear();

      const result = await service.embedInstruction(input);

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(embeddingProvider.embed).not.toHaveBeenCalled();
    });

    it('should update embedding when content hash differs', async () => {
      vi.mocked(embeddingRepository.findByInstructionId).mockResolvedValue({
        id: 'emb-1',
        instructionId: 'instr-1',
        projectId: 'proj-1',
        organizationId: 'org-1',
        embedding: mockEmbedding,
        contentHash: 'old-hash',
        model: 'text-embedding-3-small',
        inputTokens: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.embedInstruction({
        instructionId: 'instr-1',
        projectId: 'proj-1',
        organizationId: 'org-1',
        name: 'updated-agent',
        description: 'Updated description',
        content: '# Updated Content',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(embeddingProvider.embed).toHaveBeenCalled();
    });

    it('should return failed when embedding fails', async () => {
      vi.mocked(embeddingProvider.embed).mockRejectedValue(new Error('API error'));

      const result = await service.embedInstruction({
        instructionId: 'instr-1',
        projectId: 'proj-1',
        organizationId: 'org-1',
        name: 'test-agent',
        description: 'A test agent',
        content: '# Test Agent',
      });

      expect(result.success).toBe(false);
      expect(result.action).toBe('failed');
      expect(result.error).toBe('API error');
    });

    it('should skip when embedding is disabled', async () => {
      const disabledConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'embedding.enabled') return false;
          return undefined;
        }),
      } as unknown as ConfigService;

      const disabledService = new InstructionEmbeddingService(
        embeddingProvider,
        embeddingRepository,
        logger,
        disabledConfigService,
      );

      const result = await disabledService.embedInstruction({
        instructionId: 'instr-1',
        projectId: 'proj-1',
        organizationId: 'org-1',
        name: 'test-agent',
        description: 'A test agent',
        content: '# Test Agent',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(embeddingProvider.embed).not.toHaveBeenCalled();
    });
  });

  describe('shouldEmbed', () => {
    it('should return true for new instruction', async () => {
      const result = await service.shouldEmbed('instr-1', 'name', 'desc', 'content');
      expect(result).toBe(true);
    });

    it('should return false when disabled', async () => {
      const disabledConfigService = {
        get: vi.fn((key: string) => {
          if (key === 'embedding.enabled') return false;
          return undefined;
        }),
      } as unknown as ConfigService;

      const disabledService = new InstructionEmbeddingService(
        embeddingProvider,
        embeddingRepository,
        logger,
        disabledConfigService,
      );

      const result = await disabledService.shouldEmbed('instr-1', 'name', 'desc', 'content');
      expect(result).toBe(false);
    });
  });

  describe('deleteEmbedding', () => {
    it('should delegate to repository', async () => {
      await service.deleteEmbedding('instr-1');
      expect(embeddingRepository.deleteByInstructionId).toHaveBeenCalledWith('instr-1');
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });
});
