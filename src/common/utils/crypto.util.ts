import * as crypto from 'crypto';

/**
 * Normalize content for consistent hashing.
 * - Converts CRLF to LF (Windows line endings to Unix)
 * - Trims leading/trailing whitespace
 *
 * @param content - Raw content string
 * @returns Normalized content
 */
export function normalizeContent(content: string): string {
  return content.replace(/\r\n/g, '\n').trim();
}

/**
 * Compute SHA-256 hash of content.
 * Content is normalized before hashing for consistency.
 *
 * @param content - Content to hash (will be normalized)
 * @returns Hex-encoded SHA-256 hash
 */
export function computeContentHash(content: string): string {
  const normalized = normalizeContent(content);
  return crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
}
