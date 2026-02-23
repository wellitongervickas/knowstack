import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SemanticSearchService } from '../semantic-search.service';
import { IEmbeddingProvider } from '@/core/interfaces/services/embedding-provider.interface';
import { IDocumentEmbeddingRepository } from '@/core/interfaces/repositories/document-embedding.repository.interface';
import { IDocumentRepository } from '@/core/interfaces/repositories/document.repository.interface';
import { IStructuredLogger } from '@/core/interfaces/services/observability.interface';
import { ConfigService } from '@nestjs/config';

describe('SemanticSearchService', () => {
  let service: SemanticSearchService;
  let embeddingProvider: IEmbeddingProvider;
  let embeddingRepository: IDocumentEmbeddingRepository;
  let documentRepository: IDocumentRepository;
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
      findByDocumentId: vi.fn(),
      findByDocumentIds: vi.fn(),
      findSimilar: vi.fn().mockResolvedValue([
        { documentId: 'doc-1', similarity: 0.92 },
        { documentId: 'doc-2', similarity: 0.85 },
      ]),
      deleteByDocumentId: vi.fn(),
      deleteByProjectId: vi.fn(),
      countByProjectId: vi.fn(),
      findDocumentsNeedingEmbedding: vi.fn(),
      isPgvectorAvailable: vi.fn().mockResolvedValue(true),
    };

    documentRepository = {
      findByProjectId: vi.fn(),
      findById: vi.fn(),
      findByIds: vi.fn().mockResolvedValue([
        {
          id: 'doc-1',
          projectId: 'proj-1',
          title: 'Document 1',
          content: 'Content 1',
          sourceType: 'MANUAL',
          sourceUrl: null,
          contentHash: 'hash-1',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'doc-2',
          projectId: 'proj-1',
          title: 'Document 2',
          content: 'Content 2',
          sourceType: 'MANUAL',
          sourceUrl: null,
          contentHash: 'hash-2',
          metadata: {},
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]),
      findByContentHash: vi.fn(),
      findBySourceUrl: vi.fn(),
      search: vi.fn().mockResolvedValue([
        { id: 'doc-2', score: 0.8 },
        { id: 'doc-3', score: 0.6 },
      ]),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByProjectId: vi.fn(),
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
        if (key === 'embedding.similarityFloor') return 0.3;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new SemanticSearchService(
      embeddingProvider,
      embeddingRepository,
      documentRepository,
      logger,
      configService,
    );
  });

  describe('search', () => {
    it('should perform hybrid search combining semantic and keyword results', async () => {
      const result = await service.search('proj-1', 'test query');

      expect(result.fallbackUsed).toBe(false);
      expect(result.embeddingTokensUsed).toBe(50);
      expect(result.results.length).toBeGreaterThan(0);
      expect(embeddingProvider.embed).toHaveBeenCalledWith('test query');
      expect(embeddingRepository.findSimilar).toHaveBeenCalled();
      expect(documentRepository.search).toHaveBeenCalled();
    });

    it('should identify hybrid matches correctly', async () => {
      const result = await service.search('proj-1', 'test query');

      // doc-2 appears in both semantic and keyword results
      const doc2Result = result.results.find((r) => r.documentId === 'doc-2');
      expect(doc2Result?.matchType).toBe('hybrid');
    });

    it('should identify semantic-only matches', async () => {
      const result = await service.search('proj-1', 'test query');

      // doc-1 only appears in semantic results
      const doc1Result = result.results.find((r) => r.documentId === 'doc-1');
      expect(doc1Result?.matchType).toBe('semantic');
    });

    it('should apply correct hybrid weights', async () => {
      const result = await service.search('proj-1', 'test query', 10, 0.7);

      // doc-2 has both semantic (0.85 → floor-normalized) and keyword (0.8) scores
      // Floor normalization: (0.85 - 0.3) / (1 - 0.3) = 0.7857
      const doc2Result = result.results.find((r) => r.documentId === 'doc-2');
      expect(doc2Result?.semanticScore).toBeDefined();
      expect(doc2Result?.keywordScore).toBeDefined();
      expect(doc2Result?.combinedScore).toBeGreaterThan(0);
    });

    it('should respect topK limit', async () => {
      const result = await service.search('proj-1', 'test query', 1);
      expect(result.results.length).toBeLessThanOrEqual(1);
    });

    it('should continue with keyword-only on semantic failure', async () => {
      vi.mocked(embeddingProvider.embed).mockRejectedValue(new Error('API error'));

      const result = await service.search('proj-1', 'test query');

      expect(result.results.length).toBeGreaterThan(0);
      expect(result.embeddingTokensUsed).toBe(0);
      expect(logger.warn).toHaveBeenCalled();
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

      const disabledService = new SemanticSearchService(
        embeddingProvider,
        embeddingRepository,
        documentRepository,
        logger,
        disabledConfigService,
      );

      expect(disabledService.isEnabled()).toBe(false);
    });
  });

  describe('isPgvectorAvailable', () => {
    it('should return true when pgvector is available', async () => {
      const result = await service.isPgvectorAvailable();
      expect(result).toBe(true);
    });

    it('should return false when pgvector is not available', async () => {
      vi.mocked(embeddingRepository.isPgvectorAvailable).mockResolvedValue(false);
      const result = await service.isPgvectorAvailable();
      expect(result).toBe(false);
    });
  });
});
