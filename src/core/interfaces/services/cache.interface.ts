/**
 * Cache service interface.
 * Provides abstraction over caching implementations (Redis, in-memory, etc.)
 */
export interface ICacheService {
  /**
   * Get a value from cache.
   * @returns Parsed value or null if key doesn't exist or is expired.
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set a value in cache with optional TTL.
   * @param ttlSeconds - Time to live in seconds. Uses default if not provided.
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Delete a key from cache.
   */
  del(key: string): Promise<void>;

  /**
   * Delete all keys matching a pattern.
   *
   * **Note:** This is a best-effort operation. Implementation is Redis-specific
   * (uses SCAN + DEL) and is NOT guaranteed O(1). Performance depends on the
   * number of matching keys. If another cache backend is added, this method
   * may behave differently or be unsupported.
   *
   * @param pattern - Glob pattern (e.g., "ks:query:project-123:*")
   * @returns Number of keys deleted (best-effort count).
   */
  delByPattern(pattern: string): Promise<number>;

  /**
   * Increment a numeric value atomically.
   * Creates key with value 1 if it doesn't exist.
   * Useful for counters (rate limiting, analytics).
   */
  incr(key: string): Promise<number>;

  /**
   * Set expiration on an existing key.
   * @returns true if timeout was set, false if key doesn't exist.
   */
  expire(key: string, ttlSeconds: number): Promise<boolean>;

  /**
   * Check if cache service is available and healthy.
   */
  isHealthy(): Promise<boolean>;
}

export const CACHE_SERVICE = Symbol('CACHE_SERVICE');
