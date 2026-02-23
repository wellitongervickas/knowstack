import { describe, it, expect } from 'vitest';
import {
  computeDocumentsHash,
  generateQueryCacheKey,
  getProjectCachePattern,
  CACHE_KEY_PREFIX,
} from '@/common/utils/cache-key.util';
import { Document } from '@/core/entities/document.entity';

const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
  id: 'doc-1',
  projectId: 'proj-1',
  title: 'Test Doc',
  content: 'Test content',
  sourceType: 'MANUAL',
  sourceUrl: null,
  contentHash: 'hash123',
  metadata: {},
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  ...overrides,
});

describe('cache-key.util', () => {
  describe('CACHE_KEY_PREFIX', () => {
    it('should be "ks"', () => {
      expect(CACHE_KEY_PREFIX).toBe('ks');
    });
  });

  describe('computeDocumentsHash', () => {
    it('should produce same hash for same documents regardless of order', () => {
      const doc1 = createMockDocument({ id: 'a', updatedAt: new Date('2024-01-01') });
      const doc2 = createMockDocument({ id: 'b', updatedAt: new Date('2024-01-02') });

      const hash1 = computeDocumentsHash([doc1, doc2]);
      const hash2 = computeDocumentsHash([doc2, doc1]);

      expect(hash1).toBe(hash2);
    });

    it('should produce different hash when document is updated', () => {
      const doc1 = createMockDocument({ id: 'a', updatedAt: new Date('2024-01-01') });
      const doc1Updated = createMockDocument({ id: 'a', updatedAt: new Date('2024-01-02') });

      const hash1 = computeDocumentsHash([doc1]);
      const hash2 = computeDocumentsHash([doc1Updated]);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hash when document is added', () => {
      const doc1 = createMockDocument({ id: 'a', updatedAt: new Date('2024-01-01') });
      const doc2 = createMockDocument({ id: 'b', updatedAt: new Date('2024-01-02') });

      const hash1 = computeDocumentsHash([doc1]);
      const hash2 = computeDocumentsHash([doc1, doc2]);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce different hash when document is removed', () => {
      const doc1 = createMockDocument({ id: 'a', updatedAt: new Date('2024-01-01') });
      const doc2 = createMockDocument({ id: 'b', updatedAt: new Date('2024-01-02') });

      const hash1 = computeDocumentsHash([doc1, doc2]);
      const hash2 = computeDocumentsHash([doc1]);

      expect(hash1).not.toBe(hash2);
    });

    it('should produce consistent hash for empty documents', () => {
      const hash1 = computeDocumentsHash([]);
      const hash2 = computeDocumentsHash([]);

      expect(hash1).toBe(hash2);
    });

    it('should return a valid SHA256 hash (64 hex characters)', () => {
      const doc = createMockDocument();
      const hash = computeDocumentsHash([doc]);

      expect(hash).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('generateQueryCacheKey', () => {
    it('should produce consistent keys for same inputs', () => {
      const key1 = generateQueryCacheKey('proj-1', 'Hello', 'ctx');
      const key2 = generateQueryCacheKey('proj-1', 'Hello', 'ctx');

      expect(key1).toBe(key2);
    });

    it('should be case-insensitive for query', () => {
      const key1 = generateQueryCacheKey('proj-1', 'Hello World');
      const key2 = generateQueryCacheKey('proj-1', 'hello world');

      expect(key1).toBe(key2);
    });

    it('should be case-insensitive for context', () => {
      const key1 = generateQueryCacheKey('proj-1', 'query', 'Context');
      const key2 = generateQueryCacheKey('proj-1', 'query', 'context');

      expect(key1).toBe(key2);
    });

    it('should trim whitespace from query', () => {
      const key1 = generateQueryCacheKey('proj-1', '  hello  ');
      const key2 = generateQueryCacheKey('proj-1', 'hello');

      expect(key1).toBe(key2);
    });

    it('should include projectId in key', () => {
      const key = generateQueryCacheKey('proj-123', 'query');

      expect(key).toContain('proj-123');
      expect(key).toMatch(/^ks:query:proj-123:/);
    });

    it('should produce different keys for different projects', () => {
      const key1 = generateQueryCacheKey('proj-1', 'query');
      const key2 = generateQueryCacheKey('proj-2', 'query');

      expect(key1).not.toBe(key2);
    });

    it('should produce different keys for different queries', () => {
      const key1 = generateQueryCacheKey('proj-1', 'query1');
      const key2 = generateQueryCacheKey('proj-1', 'query2');

      expect(key1).not.toBe(key2);
    });

    it('should produce different keys for different contexts', () => {
      const key1 = generateQueryCacheKey('proj-1', 'query', 'context-a');
      const key2 = generateQueryCacheKey('proj-1', 'query', 'context-b');

      expect(key1).not.toBe(key2);
    });

    it('should handle undefined context same as empty context', () => {
      const key1 = generateQueryCacheKey('proj-1', 'query');
      const key2 = generateQueryCacheKey('proj-1', 'query', '');

      expect(key1).toBe(key2);
    });
  });

  describe('getProjectCachePattern', () => {
    it('should return correct glob pattern', () => {
      const pattern = getProjectCachePattern('proj-123');

      expect(pattern).toBe('ks:query:proj-123:*');
    });

    it('should include the cache key prefix', () => {
      const pattern = getProjectCachePattern('proj-123');

      expect(pattern.startsWith(CACHE_KEY_PREFIX)).toBe(true);
    });
  });
});
