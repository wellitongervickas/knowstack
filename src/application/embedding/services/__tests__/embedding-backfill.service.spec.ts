import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmbeddingBackfillService } from '../embedding-backfill.service';
import { DocumentEmbeddingService } from '../document-embedding.service';
import { IDocumentRepository } from '@/core/interfaces/repositories/document.repository.interface';
import { IDocumentEmbeddingRepository } from '@/core/interfaces/repositories/document-embedding.repository.interface';
import { IStructuredLogger } from '@/core/interfaces/services/observability.interface';
import { ConfigService } from '@nestjs/config';
import { Document } from '@/core/entities/document.entity';

describe('EmbeddingBackfillService', () => {
  let service: EmbeddingBackfillService;
  let documentRepository: IDocumentRepository;
  let embeddingRepository: IDocumentEmbeddingRepository;
  let logger: IStructuredLogger;
  let embeddingService: DocumentEmbeddingService;
  let configService: ConfigService;

  const mockDocuments: Document[] = [
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
  ];

  beforeEach(() => {
    documentRepository = {
      findByProjectId: vi.fn().mockResolvedValue(mockDocuments),
      findById: vi
        .fn()
        .mockImplementation((id: string) => mockDocuments.find((d) => d.id === id) ?? null),
      findByIds: vi.fn(),
      findByContentHash: vi.fn(),
      findBySourceUrl: vi.fn(),
      search: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteByProjectId: vi.fn(),
    };

    embeddingRepository = {
      upsert: vi.fn(),
      findByDocumentId: vi.fn(),
      findByDocumentIds: vi.fn(),
      findSimilar: vi.fn(),
      deleteByDocumentId: vi.fn(),
      deleteByProjectId: vi.fn(),
      countByProjectId: vi.fn().mockResolvedValue(0),
      findDocumentsNeedingEmbedding: vi.fn().mockResolvedValue([
        { id: 'doc-1', contentHash: 'hash-1' },
        { id: 'doc-2', contentHash: 'hash-2' },
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
      embedDocument: vi.fn().mockResolvedValue({
        success: true,
        documentId: 'doc-1',
        action: 'created',
        tokensUsed: 100,
      }),
      embedDocumentWithTracking: vi.fn().mockResolvedValue({
        success: true,
        documentId: 'doc-1',
        action: 'created',
        tokensUsed: 100,
      }),
      shouldEmbed: vi.fn().mockResolvedValue(true),
      deleteEmbedding: vi.fn(),
      isEnabled: vi.fn().mockReturnValue(true),
    } as unknown as DocumentEmbeddingService;

    configService = {
      get: vi.fn((key: string) => {
        if (key === 'embedding.maxBatchSize') return 100;
        return undefined;
      }),
    } as unknown as ConfigService;

    service = new EmbeddingBackfillService(
      documentRepository,
      embeddingRepository,
      logger,
      embeddingService,
      configService,
    );
  });

  describe('backfill', () => {
    it('should process all documents without embeddings', async () => {
      const result = await service.backfill({ projectId: 'proj-1' }, 'org-1');

      expect(result.total).toBe(2);
      expect(result.embedded).toBe(2);
      expect(result.skipped).toBe(0);
      expect(result.failed).toBe(0);
      expect(embeddingService.embedDocumentWithTracking).toHaveBeenCalledTimes(2);
    });

    it('should return dry run estimate without processing', async () => {
      const result = await service.backfill({ projectId: 'proj-1', dryRun: true }, 'org-1');

      expect(result.total).toBe(2);
      expect(result.embedded).toBe(0);
      expect(result.estimatedCostUsd).toBeGreaterThan(0);
      expect(embeddingService.embedDocumentWithTracking).not.toHaveBeenCalled();
    });

    it('should force regenerate all documents when flag is set', async () => {
      vi.mocked(embeddingService.shouldEmbed).mockResolvedValue(false);

      const result = await service.backfill(
        { projectId: 'proj-1', forceRegenerate: true },
        'org-1',
      );

      expect(result.embedded).toBe(2);
      expect(embeddingService.shouldEmbed).not.toHaveBeenCalled();
    });

    it('should skip documents that do not need embedding', async () => {
      vi.mocked(embeddingService.embedDocumentWithTracking).mockResolvedValue({
        success: true,
        documentId: 'doc-1',
        action: 'skipped',
      });

      const result = await service.backfill({ projectId: 'proj-1' }, 'org-1');

      expect(result.skipped).toBe(2);
      expect(result.embedded).toBe(0);
    });

    it('should handle embedding failures gracefully', async () => {
      vi.mocked(embeddingService.embedDocumentWithTracking)
        .mockResolvedValueOnce({
          success: true,
          documentId: 'doc-1',
          action: 'created',
          tokensUsed: 100,
        })
        .mockResolvedValueOnce({
          success: false,
          documentId: 'doc-2',
          action: 'failed',
          error: 'API error',
        });

      const result = await service.backfill({ projectId: 'proj-1' }, 'org-1');

      expect(result.embedded).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors?.[0].documentId).toBe('doc-2');
    });

    it('should call progress callback', async () => {
      const progressCallback = vi.fn();

      await service.backfill({ projectId: 'proj-1', batchSize: 1 }, 'org-1', progressCallback);

      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      vi.mocked(embeddingRepository.findDocumentsNeedingEmbedding).mockResolvedValue([
        { id: 'doc-2', contentHash: 'hash-2' },
      ]);

      const stats = await service.getStats('proj-1');

      expect(stats.totalDocuments).toBe(2);
      expect(stats.embeddedDocuments).toBe(1);
      expect(stats.pendingDocuments).toBe(1);
    });
  });
});
