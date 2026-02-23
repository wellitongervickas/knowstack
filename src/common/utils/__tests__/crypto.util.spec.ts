import { describe, it, expect } from 'vitest';
import { normalizeContent, computeContentHash } from '@/common/utils/crypto.util';

describe('crypto.util', () => {
  describe('normalizeContent', () => {
    it('should convert CRLF to LF', () => {
      const input = 'line1\r\nline2\r\nline3';
      const result = normalizeContent(input);

      expect(result).toBe('line1\nline2\nline3');
      expect(result).not.toContain('\r');
    });

    it('should trim leading and trailing whitespace', () => {
      const input = '  \n  content here  \n  ';
      const result = normalizeContent(input);

      expect(result).toBe('content here');
    });
  });

  describe('computeContentHash', () => {
    it('should return same hash for identical content', () => {
      const content = 'Hello, World!';

      const hash1 = computeContentHash(content);
      const hash2 = computeContentHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
    });

    it('should return same hash for content differing only in line endings and whitespace', () => {
      const windowsContent = '  line1\r\nline2\r\nline3  ';
      const unixContent = 'line1\nline2\nline3';

      const windowsHash = computeContentHash(windowsContent);
      const unixHash = computeContentHash(unixContent);

      expect(windowsHash).toBe(unixHash);
    });

    it('should return different hash for different content', () => {
      const hash1 = computeContentHash('Content A');
      const hash2 = computeContentHash('Content B');

      expect(hash1).not.toBe(hash2);
    });
  });
});
