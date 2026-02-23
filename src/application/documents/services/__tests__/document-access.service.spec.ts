import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DocumentNotFoundException } from '@/core/exceptions/document.exception';
import { DocumentAccessService } from '../document-access.service';
import type { IDocumentRepository } from '@/core/interfaces/repositories/document.repository.interface';
import type {
  DocumentListQueryDto,
  DocumentSearchQueryDto,
} from '@/application/documents/dto/document-query.dto';

// Test data factory
const createTestDocument = (overrides = {}) => ({
  id: 'doc-1',
  projectId: 'proj-1',
  title: 'Test Document',
  content: 'A'.repeat(300), // 300 chars for content preview testing
  sourceType: 'MANUAL' as const,
  sourceUrl: null,
  contentHash: 'sha256:abc123',
  metadata: {},
  createdAt: new Date('2026-01-15T10:00:00.000Z'),
  updatedAt: new Date('2026-01-15T10:00:00.000Z'),
  ...overrides,
});

describe('DocumentAccessService', () => {
  let service: DocumentAccessService;
  let mockRepository: {
    findByProjectId: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByIds: ReturnType<typeof vi.fn>;
    search: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findByProjectId: vi.fn(),
      findById: vi.fn(),
      findByIds: vi.fn(),
      search: vi.fn(),
    };

    service = new DocumentAccessService(mockRepository as unknown as IDocumentRepository);
  });

  describe('listDocuments', () => {
    it('should return paginated results with correct pagination metadata', async () => {
      const docs = [
        createTestDocument({ id: 'doc-1', createdAt: new Date('2026-01-15') }),
        createTestDocument({ id: 'doc-2', createdAt: new Date('2026-01-14') }),
        createTestDocument({ id: 'doc-3', createdAt: new Date('2026-01-13') }),
      ];
      mockRepository.findByProjectId.mockResolvedValue(docs);

      const query: DocumentListQueryDto = { page: 1, limit: 2 };
      const result = await service.listDocuments('proj-1', query);

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        total: 3,
        page: 1,
        limit: 2,
        totalPages: 2,
      });
      expect(mockRepository.findByProjectId).toHaveBeenCalledWith('proj-1');
    });

    it('should filter by sourceType when provided', async () => {
      const docs = [
        createTestDocument({ id: 'doc-1', sourceType: 'URL' }),
        createTestDocument({ id: 'doc-2', sourceType: 'MANUAL' }),
        createTestDocument({ id: 'doc-3', sourceType: 'URL' }),
      ];
      mockRepository.findByProjectId.mockResolvedValue(docs);

      const query: DocumentListQueryDto = { page: 1, limit: 20, sourceType: 'URL' };
      const result = await service.listDocuments('proj-1', query);

      expect(result.data).toHaveLength(2);
      expect(result.data[0].sourceType).toBe('URL');
      expect(result.data[1].sourceType).toBe('URL');
      expect(result.pagination.total).toBe(2);
    });

    it('should return all documents when no sourceType filter', async () => {
      const docs = [
        createTestDocument({ id: 'doc-1', sourceType: 'URL' }),
        createTestDocument({ id: 'doc-2', sourceType: 'MANUAL' }),
      ];
      mockRepository.findByProjectId.mockResolvedValue(docs);

      const query: DocumentListQueryDto = { page: 1, limit: 20 };
      const result = await service.listDocuments('proj-1', query);

      expect(result.data).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should sort by createdAt descending', async () => {
      const docs = [
        createTestDocument({ id: 'doc-1', createdAt: new Date('2026-01-10') }),
        createTestDocument({ id: 'doc-2', createdAt: new Date('2026-01-15') }),
        createTestDocument({ id: 'doc-3', createdAt: new Date('2026-01-12') }),
      ];
      mockRepository.findByProjectId.mockResolvedValue(docs);

      const query: DocumentListQueryDto = { page: 1, limit: 20 };
      const result = await service.listDocuments('proj-1', query);

      expect(result.data[0].id).toBe('doc-2'); // 2026-01-15 (newest)
      expect(result.data[1].id).toBe('doc-3'); // 2026-01-12
      expect(result.data[2].id).toBe('doc-1'); // 2026-01-10 (oldest)
    });

    it('should handle empty results (no documents)', async () => {
      mockRepository.findByProjectId.mockResolvedValue([]);

      const query: DocumentListQueryDto = { page: 1, limit: 20 };
      const result = await service.listDocuments('proj-1', query);

      expect(result.data).toEqual([]);
      expect(result.pagination).toEqual({
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      });
    });

    it('should handle page beyond last page (returns empty data)', async () => {
      const docs = [createTestDocument({ id: 'doc-1' })];
      mockRepository.findByProjectId.mockResolvedValue(docs);

      const query: DocumentListQueryDto = { page: 5, limit: 20 };
      const result = await service.listDocuments('proj-1', query);

      expect(result.data).toEqual([]);
      expect(result.pagination).toEqual({
        total: 1,
        page: 5,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should use default page=1 and limit=20 when not provided', async () => {
      const docs = Array.from({ length: 25 }, (_, i) =>
        createTestDocument({ id: `doc-${i + 1}`, createdAt: new Date(`2026-01-${25 - i}`) }),
      );
      mockRepository.findByProjectId.mockResolvedValue(docs);

      const query: DocumentListQueryDto = {};
      const result = await service.listDocuments('proj-1', query);

      expect(result.data).toHaveLength(20); // Default limit
      expect(result.pagination.page).toBe(1); // Default page
      expect(result.pagination.limit).toBe(20);
      expect(result.pagination.total).toBe(25);
      expect(result.pagination.totalPages).toBe(2);
    });

    it('should map documents via mapDocumentToResponse (contentPreview, no projectId)', async () => {
      const docs = [createTestDocument({ id: 'doc-1', content: 'A'.repeat(300) })];
      mockRepository.findByProjectId.mockResolvedValue(docs);

      const query: DocumentListQueryDto = { page: 1, limit: 20 };
      const result = await service.listDocuments('proj-1', query);

      expect(result.data[0]).toHaveProperty('contentPreview');
      expect(result.data[0]).not.toHaveProperty('content');
      expect(result.data[0]).not.toHaveProperty('projectId');
      expect(result.data[0].contentPreview).toHaveLength(203); // Preview is 200 chars + "..." = 203
    });

    it('should calculate totalPages correctly for exact multiples', async () => {
      const docs = Array.from({ length: 40 }, (_, i) => createTestDocument({ id: `doc-${i + 1}` }));
      mockRepository.findByProjectId.mockResolvedValue(docs);

      const query: DocumentListQueryDto = { page: 1, limit: 20 };
      const result = await service.listDocuments('proj-1', query);

      expect(result.pagination.totalPages).toBe(2); // 40 / 20 = 2
    });

    it('should calculate totalPages correctly for non-exact multiples', async () => {
      const docs = Array.from({ length: 45 }, (_, i) => createTestDocument({ id: `doc-${i + 1}` }));
      mockRepository.findByProjectId.mockResolvedValue(docs);

      const query: DocumentListQueryDto = { page: 1, limit: 20 };
      const result = await service.listDocuments('proj-1', query);

      expect(result.pagination.totalPages).toBe(3); // Math.ceil(45 / 20) = 3
    });
  });

  describe('searchDocuments', () => {
    it('should return search results with scores', async () => {
      const searchResults = [
        { id: 'doc-1', score: 0.95 },
        { id: 'doc-2', score: 0.87 },
      ];
      const docs = [
        createTestDocument({ id: 'doc-1', title: 'Test Document 1' }),
        createTestDocument({ id: 'doc-2', title: 'Test Document 2' }),
      ];
      mockRepository.search.mockResolvedValue(searchResults);
      mockRepository.findByIds.mockResolvedValue(docs);

      const query: DocumentSearchQueryDto = { q: 'test' };
      const result = await service.searchDocuments('proj-1', query);

      expect(result.results).toHaveLength(2);
      expect(result.results[0].score).toBe(0.95);
      expect(result.results[1].score).toBe(0.87);
      expect(result.total).toBe(2);
      expect(result.query).toBe('test');
    });

    it('should hydrate documents from findByIds', async () => {
      const searchResults = [{ id: 'doc-1', score: 0.95 }];
      const docs = [createTestDocument({ id: 'doc-1', title: 'Test Document' })];
      mockRepository.search.mockResolvedValue(searchResults);
      mockRepository.findByIds.mockResolvedValue(docs);

      const query: DocumentSearchQueryDto = { q: 'test' };
      await service.searchDocuments('proj-1', query);

      expect(mockRepository.search).toHaveBeenCalledWith('proj-1', 'test', 10);
      expect(mockRepository.findByIds).toHaveBeenCalledWith(['doc-1']);
    });

    it('should filter out documents from other projects (post-fetch tenant verification)', async () => {
      const searchResults = [
        { id: 'doc-1', score: 0.95 },
        { id: 'doc-2', score: 0.87 },
      ];
      const docs = [
        createTestDocument({ id: 'doc-1', projectId: 'proj-1' }),
        createTestDocument({ id: 'doc-2', projectId: 'proj-2' }), // Different project
      ];
      mockRepository.search.mockResolvedValue(searchResults);
      mockRepository.findByIds.mockResolvedValue(docs);

      const query: DocumentSearchQueryDto = { q: 'test' };
      const result = await service.searchDocuments('proj-1', query);

      expect(result.results).toHaveLength(1); // Only doc-1 should be returned
      expect(result.results[0].id).toBe('doc-1');
      expect(result.total).toBe(1);
    });

    it('should handle no search results (empty array)', async () => {
      mockRepository.search.mockResolvedValue([]);
      mockRepository.findByIds.mockResolvedValue([]);

      const query: DocumentSearchQueryDto = { q: 'nonexistent' };
      const result = await service.searchDocuments('proj-1', query);

      expect(result.results).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.query).toBe('nonexistent');
    });

    it('should preserve search result ordering', async () => {
      const searchResults = [
        { id: 'doc-2', score: 0.95 },
        { id: 'doc-1', score: 0.87 },
        { id: 'doc-3', score: 0.75 },
      ];
      const docs = [
        createTestDocument({ id: 'doc-1', title: 'Doc 1' }),
        createTestDocument({ id: 'doc-2', title: 'Doc 2' }),
        createTestDocument({ id: 'doc-3', title: 'Doc 3' }),
      ];
      mockRepository.search.mockResolvedValue(searchResults);
      mockRepository.findByIds.mockResolvedValue(docs);

      const query: DocumentSearchQueryDto = { q: 'test' };
      const result = await service.searchDocuments('proj-1', query);

      expect(result.results[0].id).toBe('doc-2'); // Highest score first
      expect(result.results[1].id).toBe('doc-1');
      expect(result.results[2].id).toBe('doc-3');
    });

    it('should map to DocumentSearchResultDto with contentPreview', async () => {
      const searchResults = [{ id: 'doc-1', score: 0.95 }];
      const docs = [createTestDocument({ id: 'doc-1', content: 'A'.repeat(300) })];
      mockRepository.search.mockResolvedValue(searchResults);
      mockRepository.findByIds.mockResolvedValue(docs);

      const query: DocumentSearchQueryDto = { q: 'test' };
      const result = await service.searchDocuments('proj-1', query);

      expect(result.results[0]).toHaveProperty('contentPreview');
      expect(result.results[0]).toHaveProperty('score');
      expect(result.results[0]).not.toHaveProperty('content');
      expect(result.results[0]).not.toHaveProperty('projectId');
    });

    it('should use default limit=10 when not provided', async () => {
      mockRepository.search.mockResolvedValue([]);
      mockRepository.findByIds.mockResolvedValue([]);

      const query: DocumentSearchQueryDto = { q: 'test' };
      await service.searchDocuments('proj-1', query);

      expect(mockRepository.search).toHaveBeenCalledWith('proj-1', 'test', 10);
    });

    it('should use provided limit when specified', async () => {
      mockRepository.search.mockResolvedValue([]);
      mockRepository.findByIds.mockResolvedValue([]);

      const query: DocumentSearchQueryDto = { q: 'test', limit: 5 };
      await service.searchDocuments('proj-1', query);

      expect(mockRepository.search).toHaveBeenCalledWith('proj-1', 'test', 5);
    });

    it('should handle missing documents in findByIds gracefully', async () => {
      const searchResults = [
        { id: 'doc-1', score: 0.95 },
        { id: 'doc-2', score: 0.87 },
      ];
      const docs = [createTestDocument({ id: 'doc-1', title: 'Test Document 1' })]; // Only doc-1 exists
      mockRepository.search.mockResolvedValue(searchResults);
      mockRepository.findByIds.mockResolvedValue(docs);

      const query: DocumentSearchQueryDto = { q: 'test' };
      const result = await service.searchDocuments('proj-1', query);

      expect(result.results).toHaveLength(1); // Only doc-1 should be returned
      expect(result.results[0].id).toBe('doc-1');
      expect(result.total).toBe(1);
    });
  });

  describe('getDocument', () => {
    it('should return full document detail', async () => {
      const doc = createTestDocument({ id: 'doc-1', content: 'Full document content here' });
      mockRepository.findById.mockResolvedValue(doc);

      const result = await service.getDocument('proj-1', 'doc-1');

      expect(result).toHaveProperty('id', 'doc-1');
      expect(result).toHaveProperty('content', 'Full document content here');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('sourceType');
      expect(result).toHaveProperty('contentHash');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('createdAt');
      expect(result).toHaveProperty('updatedAt');
      expect(mockRepository.findById).toHaveBeenCalledWith('doc-1');
    });

    it('should throw DocumentNotFoundException when document not found', async () => {
      mockRepository.findById.mockResolvedValue(null);

      await expect(service.getDocument('proj-1', 'doc-999')).rejects.toThrow(
        DocumentNotFoundException,
      );
      await expect(service.getDocument('proj-1', 'doc-999')).rejects.toThrow('Document not found');
    });

    it('should throw DocumentNotFoundException when document belongs to different project (404 not 403)', async () => {
      const doc = createTestDocument({ id: 'doc-1', projectId: 'proj-2' }); // Different project
      mockRepository.findById.mockResolvedValue(doc);

      const error = await service.getDocument('proj-1', 'doc-1').catch((e) => e);

      expect(error).toBeInstanceOf(DocumentNotFoundException);
      expect(error.message).toContain('Document not found');
      expect(error.code).toBe('DOCUMENT_NOT_FOUND');
    });

    it('should map via mapDocumentToDetailResponse (full content, no projectId)', async () => {
      const doc = createTestDocument({ id: 'doc-1', content: 'Full content here' });
      mockRepository.findById.mockResolvedValue(doc);

      const result = await service.getDocument('proj-1', 'doc-1');

      expect(result).toHaveProperty('content', 'Full content here');
      expect(result).not.toHaveProperty('contentPreview');
      expect(result).not.toHaveProperty('projectId');
    });

    it('should return full content (not preview) in detail response', async () => {
      const fullContent = 'A'.repeat(500); // Long content
      const doc = createTestDocument({ id: 'doc-1', content: fullContent });
      mockRepository.findById.mockResolvedValue(doc);

      const result = await service.getDocument('proj-1', 'doc-1');

      expect(result.content).toBe(fullContent);
      expect(result.content.length).toBe(500);
      expect(result.content).not.toContain('...'); // No truncation
    });
  });

  describe('getDocumentsForProject', () => {
    it('should return all documents for a project', async () => {
      const docs = [
        createTestDocument({ id: 'doc-1', projectId: 'proj-1' }),
        createTestDocument({ id: 'doc-2', projectId: 'proj-1' }),
      ];
      mockRepository.findByProjectId.mockResolvedValue(docs);

      const result = await service.getDocumentsForProject('proj-1');

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('doc-1');
      expect(result[1].id).toBe('doc-2');
      expect(mockRepository.findByProjectId).toHaveBeenCalledWith('proj-1');
    });

    it('should return empty array when project has no documents', async () => {
      mockRepository.findByProjectId.mockResolvedValue([]);

      const result = await service.getDocumentsForProject('proj-1');

      expect(result).toEqual([]);
      expect(mockRepository.findByProjectId).toHaveBeenCalledWith('proj-1');
    });
  });

  describe('tenant isolation', () => {
    it('should enforce tenant isolation in listDocuments', async () => {
      const docs = [createTestDocument({ id: 'doc-1', projectId: 'proj-1' })];
      mockRepository.findByProjectId.mockResolvedValue(docs);

      const query: DocumentListQueryDto = { page: 1, limit: 20 };
      await service.listDocuments('proj-1', query);

      expect(mockRepository.findByProjectId).toHaveBeenCalledWith('proj-1');
    });

    it('should enforce tenant isolation in searchDocuments (post-fetch verification)', async () => {
      const searchResults = [{ id: 'doc-1', score: 0.95 }];
      const docs = [createTestDocument({ id: 'doc-1', projectId: 'proj-1' })];
      mockRepository.search.mockResolvedValue(searchResults);
      mockRepository.findByIds.mockResolvedValue(docs);

      const query: DocumentSearchQueryDto = { q: 'test' };
      await service.searchDocuments('proj-1', query);

      expect(mockRepository.search).toHaveBeenCalledWith('proj-1', 'test', 10);
    });

    it('should enforce tenant isolation in getDocument', async () => {
      const doc = createTestDocument({ id: 'doc-1', projectId: 'proj-1' });
      mockRepository.findById.mockResolvedValue(doc);

      await service.getDocument('proj-1', 'doc-1');

      expect(mockRepository.findById).toHaveBeenCalledWith('doc-1');
    });
  });
});
