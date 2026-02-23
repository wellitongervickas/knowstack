import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UrlFetcher } from '@/infrastructure/ingestion/fetchers/url-fetcher';
import { IStructuredLogger } from '@/core/interfaces/services/observability.interface';

describe('UrlFetcher', () => {
  let fetcher: UrlFetcher;
  let mockLogger: { info: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
    };

    fetcher = new UrlFetcher(mockLogger as unknown as IStructuredLogger);
  });

  describe('protocol validation', () => {
    it('should reject non-http(s) protocols', async () => {
      const result = await fetcher.fetch('ftp://example.com/file.md');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid protocol');
    });

    it('should reject file:// protocol', async () => {
      const result = await fetcher.fetch('file:///etc/passwd');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid protocol');
    });

    it('should reject invalid URLs', async () => {
      const result = await fetcher.fetch('not-a-valid-url');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
