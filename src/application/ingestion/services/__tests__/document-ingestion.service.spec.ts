import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentIngestionService } from '@/application/ingestion/services/document-ingestion.service';
import { IDocumentRepository } from '@/core/interfaces/repositories/document.repository.interface';
import { IStructuredLogger } from '@/core/interfaces/services/observability.interface';
import { ISourceFetcher } from '@/core/interfaces/services/source-fetcher.interface';
import { CacheInvalidationService } from '@/application/cache/services/cache-invalidation.service';
import { Document } from '@/core/entities/document.entity';

describe('DocumentIngestionService', () => {
  let service: DocumentIngestionService;
  let mockRepository: {
    findByContentHash: ReturnType<typeof vi.fn>;
    findBySourceUrl: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  let mockLogger: {
    info: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
  };
  let mockUrlFetcher: ISourceFetcher;
  let mockCacheInvalidation: {
    invalidateProjectCache: ReturnType<typeof vi.fn>;
  };

  const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
    id: 'doc-123',
    projectId: 'project-1',
    title: 'Test Doc',
    content: 'Test content',
    sourceType: 'MANUAL',
    sourceUrl: null,
    contentHash: 'abc123',
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockRepository = {
      findByContentHash: vi.fn(),
      findBySourceUrl: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    mockUrlFetcher = {
      sourceType: 'URL',
      fetch: vi.fn(),
    };

    mockCacheInvalidation = {
      invalidateProjectCache: vi.fn().mockResolvedValue(undefined),
    };

    service = new DocumentIngestionService(
      mockRepository as unknown as IDocumentRepository,
      mockLogger as unknown as IStructuredLogger,
      mockUrlFetcher,
      mockCacheInvalidation as unknown as CacheInvalidationService,
    );
  });

  describe('deduplication', () => {
    it('should return unchanged when document with same contentHash exists', async () => {
      const existingDoc = createMockDocument({ id: 'existing-doc' });
      mockRepository.findByContentHash.mockResolvedValue(existingDoc);

      const result = await service.ingest({
        projectId: 'project-1',
        title: 'Test Doc',
        content: 'Test content',
        sourceType: 'MANUAL',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('unchanged');
      expect(result.documentId).toBe('existing-doc');
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('update detection', () => {
    it('should update when same sourceUrl exists but content changed', async () => {
      const existingDoc = createMockDocument({
        id: 'existing-doc',
        sourceUrl: 'https://example.com/doc.md',
        contentHash: 'old-hash',
      });

      mockRepository.findByContentHash.mockResolvedValue(null);
      mockRepository.findBySourceUrl.mockResolvedValue(existingDoc);
      mockRepository.update.mockResolvedValue({
        ...existingDoc,
        content: 'New content',
        contentHash: 'new-hash',
      });

      const result = await service.ingest({
        projectId: 'project-1',
        title: 'Updated Doc',
        content: 'New content',
        sourceType: 'URL',
        sourceUrl: 'https://example.com/doc.md',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('updated');
      expect(result.documentId).toBe('existing-doc');
      expect(mockRepository.update).toHaveBeenCalledWith(
        'existing-doc',
        expect.objectContaining({
          title: 'Updated Doc',
          content: 'New content',
        }),
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create new document when no existing match', async () => {
      const newDoc = createMockDocument({ id: 'new-doc' });

      mockRepository.findByContentHash.mockResolvedValue(null);
      mockRepository.findBySourceUrl.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(newDoc);

      const result = await service.ingest({
        projectId: 'project-1',
        title: 'New Doc',
        content: 'Brand new content',
        sourceType: 'MANUAL',
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe('created');
      expect(result.documentId).toBe('new-doc');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'project-1',
          title: 'New Doc',
          sourceType: 'MANUAL',
        }),
      );
    });
  });

  describe('batch failure isolation', () => {
    it('should continue processing after individual failures in batch', async () => {
      const successDoc = createMockDocument({ id: 'success-doc' });

      // First call fails, second succeeds
      mockRepository.findByContentHash
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(null);
      mockRepository.findBySourceUrl.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(successDoc);

      const results = await service.ingestBatch([
        {
          projectId: 'project-1',
          title: 'Failing Doc',
          content: 'Content 1',
          sourceType: 'MANUAL',
        },
        {
          projectId: 'project-1',
          title: 'Success Doc',
          content: 'Content 2',
          sourceType: 'MANUAL',
        },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(false);
      expect(results[0].action).toBe('failed');
      expect(results[0].error).toBe('Database error');
      expect(results[1].success).toBe(true);
      expect(results[1].action).toBe('created');
    });
  });
});
