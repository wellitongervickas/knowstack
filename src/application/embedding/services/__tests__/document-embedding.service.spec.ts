import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentEmbeddingService } from '../document-embedding.service';
import { IEmbeddingProvider } from '@/core/interfaces/services/embedding-provider.interface';
import { IDocumentEmbeddingRepository } from '@/core/interfaces/repositories/document-embedding.repository.interface';
import { IStructuredLogger } from '@/core/interfaces/services/observability.interface';
import { ConfigService } from '@nestjs/config';

describe('DocumentEmbeddingService', () => {
  let service: DocumentEmbeddingService;
  let embeddingProvider: IEmbeddingProvider;
  let embeddingRepository: IDocumentEmbeddingRepository;
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
        documentId: 'doc-1',
        projectId: 'proj-1',
        embedding: mockEmbedding,
        contentHash: 'hash-1',
        model: 'text-embedding-3-small',
        inputTokens: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      findByDocumentId: vi.fn().mockResolvedValue(null),
      findByDocumentIds: vi.fn().mockResolvedValue([]),
      findSimilar: vi.fn().mockResolvedValue([]),
      deleteByDocumentId: vi.fn(),
      deleteByProjectId: vi.fn(),
      countByProjectId: vi.fn().mockResolvedValue(0),
      findDocumentsNeedingEmbedding: vi.fn().mockResolvedValue([]),
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

    service = new DocumentEmbeddingService(
      embeddingProvider,
      embeddingRepository,
      logger,
      configService,
    );
  });

  describe('embedDocument', () => {
    it('should create embedding for new document', async () => {
      const result = await service.embedDocument({
        documentId: 'doc-1',
        projectId: 'proj-1',
        title: 'Test Document',
        content: 'Test content',
        contentHash: 'hash-1',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.tokensUsed).toBe(100);
      expect(embeddingProvider.embed).toHaveBeenCalled();
      expect(embeddingRepository.upsert).toHaveBeenCalled();
    });

    it('should skip embedding when content hash matches', async () => {
      vi.mocked(embeddingRepository.findByDocumentId).mockResolvedValue({
        id: 'emb-1',
        documentId: 'doc-1',
        projectId: 'proj-1',
        embedding: mockEmbedding,
        contentHash: 'hash-1',
        model: 'text-embedding-3-small',
        inputTokens: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.embedDocument({
        documentId: 'doc-1',
        projectId: 'proj-1',
        title: 'Test Document',
        content: 'Test content',
        contentHash: 'hash-1',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(embeddingProvider.embed).not.toHaveBeenCalled();
    });

    it('should update embedding when content hash differs', async () => {
      vi.mocked(embeddingRepository.findByDocumentId).mockResolvedValue({
        id: 'emb-1',
        documentId: 'doc-1',
        projectId: 'proj-1',
        embedding: mockEmbedding,
        contentHash: 'old-hash',
        model: 'text-embedding-3-small',
        inputTokens: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.embedDocument({
        documentId: 'doc-1',
        projectId: 'proj-1',
        title: 'Updated Document',
        content: 'Updated content',
        contentHash: 'new-hash',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(embeddingProvider.embed).toHaveBeenCalled();
    });

    it('should return failed when embedding fails', async () => {
      vi.mocked(embeddingProvider.embed).mockRejectedValue(new Error('API error'));

      const result = await service.embedDocument({
        documentId: 'doc-1',
        projectId: 'proj-1',
        title: 'Test Document',
        content: 'Test content',
        contentHash: 'hash-1',
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

      const disabledService = new DocumentEmbeddingService(
        embeddingProvider,
        embeddingRepository,
        logger,
        disabledConfigService,
      );

      const result = await disabledService.embedDocument({
        documentId: 'doc-1',
        projectId: 'proj-1',
        title: 'Test Document',
        content: 'Test content',
        contentHash: 'hash-1',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('skipped');
      expect(embeddingProvider.embed).not.toHaveBeenCalled();
    });
  });

  describe('shouldEmbed', () => {
    it('should return true for new document', async () => {
      const result = await service.shouldEmbed('doc-1', 'hash-1');
      expect(result).toBe(true);
    });

    it('should return false when hash matches', async () => {
      vi.mocked(embeddingRepository.findByDocumentId).mockResolvedValue({
        id: 'emb-1',
        documentId: 'doc-1',
        projectId: 'proj-1',
        embedding: mockEmbedding,
        contentHash: 'hash-1',
        model: 'text-embedding-3-small',
        inputTokens: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.shouldEmbed('doc-1', 'hash-1');
      expect(result).toBe(false);
    });

    it('should return true when hash differs', async () => {
      vi.mocked(embeddingRepository.findByDocumentId).mockResolvedValue({
        id: 'emb-1',
        documentId: 'doc-1',
        projectId: 'proj-1',
        embedding: mockEmbedding,
        contentHash: 'old-hash',
        model: 'text-embedding-3-small',
        inputTokens: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.shouldEmbed('doc-1', 'new-hash');
      expect(result).toBe(true);
    });
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      expect(service.isEnabled()).toBe(true);
    });
  });
});
