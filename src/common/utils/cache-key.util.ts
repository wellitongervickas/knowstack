import * as crypto from 'crypto';
import { Document } from '@/core/entities/document.entity';

/**
 * Cache key prefix for KnowStack.
 */
export const CACHE_KEY_PREFIX = 'ks';

/**
 * Compute a SHA256 hash of the input string.
 */
function sha256(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Generate a documents hash from document IDs and updatedAt timestamps.
 * This hash changes when any document is added, removed, or updated.
 *
 * @param documents - Array of documents to hash.
 * @returns SHA256 hash of sorted document IDs and timestamps.
 */
export function computeDocumentsHash(documents: Document[]): string {
  if (documents.length === 0) {
    return sha256('empty');
  }

  // Sort by ID for deterministic ordering
  const sorted = [...documents].sort((a, b) => a.id.localeCompare(b.id));

  // Combine ID + updatedAt for each document
  const payload = sorted.map((doc) => `${doc.id}:${doc.updatedAt.toISOString()}`).join('|');

  return sha256(payload);
}

/**
 * Generate a query cache key.
 * Format: ks:query:{projectId}:{hash(query + context)}
 *
 * Cache correctness relies on project-level invalidation:
 * `delByPattern(ks:query:{projectId}:*)` wipes all entries on any document change,
 * so documentsHash is not needed in the key.
 *
 * @param projectId - The project ID.
 * @param query - The user query (normalized to lowercase, trimmed).
 * @param context - Optional additional context.
 * @returns Fully qualified cache key.
 */
export function generateQueryCacheKey(projectId: string, query: string, context?: string): string {
  const payload = [query.trim().toLowerCase(), context?.trim().toLowerCase() ?? ''].join('::');

  const hash = sha256(payload);

  return `${CACHE_KEY_PREFIX}:query:${projectId}:${hash}`;
}

/**
 * Generate the pattern for invalidating all query cache for a project.
 * Format: ks:query:{projectId}:*
 *
 * @param projectId - The project ID.
 * @returns Glob pattern for Redis SCAN/DEL operations.
 */
export function getProjectCachePattern(projectId: string): string {
  return `${CACHE_KEY_PREFIX}:query:${projectId}:*`;
}
