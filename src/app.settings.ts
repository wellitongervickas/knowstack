/**
 * Application settings.
 * Environment-configurable values with sensible defaults.
 *
 * These values are read from process.env with fallback defaults.
 * Change .env file to update all consumers without modifying code.
 *
 * Usage:
 * - For static values (numbers, patterns), use app.constants.ts or module-specific constants
 * - For environment-configurable values, use this file
 *
 * All settings can be overridden via .env file.
 */

// =============================================================================
// APPLICATION
// =============================================================================

/**
 * Application environment.
 * @env NODE_ENV
 */
export const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Whether to trust X-Forwarded-For header for IP address extraction.
 * Enable only when running behind a trusted reverse proxy (e.g., nginx, ALB).
 * WARNING: When false, IP from x-forwarded-for is ignored to prevent spoofing.
 * @env TRUST_PROXY
 */
export const TRUST_PROXY = process.env.TRUST_PROXY === 'true';

/**
 * Server port.
 * @env PORT
 */
export const PORT = parseInt(process.env.PORT || '3000', 10);

// =============================================================================
// DATABASE
// =============================================================================

/**
 * Database connection URL.
 * @env DATABASE_URL
 */
export const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/knowstack';

// =============================================================================
// REDIS
// =============================================================================

/**
 * Redis connection URL.
 * @env REDIS_URL
 */
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

/**
 * Redis cache TTL in seconds.
 * @env REDIS_CACHE_TTL_SECONDS
 */
export const REDIS_CACHE_TTL_SECONDS = parseInt(process.env.REDIS_CACHE_TTL_SECONDS || '3600', 10);

/**
 * Whether Redis caching is enabled.
 * @env REDIS_CACHE_ENABLED
 */
export const REDIS_CACHE_ENABLED = process.env.REDIS_CACHE_ENABLED !== 'false';

// =============================================================================
// AI PROVIDERS
// =============================================================================

/**
 * Default AI provider.
 * @env AI_DEFAULT_PROVIDER
 */
export const AI_DEFAULT_PROVIDER = process.env.AI_DEFAULT_PROVIDER || 'stub';

/**
 * OpenAI API key.
 * @env OPENAI_API_KEY
 */
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';

/**
 * OpenAI model.
 * gpt-4.1-mini recommended for documentation platforms (beats gpt-4o, 83% cheaper).
 * @env OPENAI_MODEL
 */
export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

/**
 * Maximum tokens for AI response generation.
 * Default 4096 handles most queries. Increase for comprehensive responses.
 * gpt-4o-mini max output: 16384 tokens
 * @env AI_MAX_RESPONSE_TOKENS
 */
export const AI_MAX_RESPONSE_TOKENS = parseInt(process.env.AI_MAX_RESPONSE_TOKENS || '4096', 10);

/**
 * Application base URL for security headers and public endpoints.
 * @env APP_BASE_URL
 */
export const APP_BASE_URL = process.env.APP_BASE_URL || '';

// =============================================================================
// EMBEDDING & SEMANTIC SEARCH
// =============================================================================

/**
 * Whether embedding feature is enabled.
 * @env EMBEDDING_ENABLED
 */
export const EMBEDDING_ENABLED = process.env.EMBEDDING_ENABLED !== 'false';

/**
 * Default embedding provider.
 * @env EMBEDDING_DEFAULT_PROVIDER
 */
export const EMBEDDING_DEFAULT_PROVIDER = process.env.EMBEDDING_DEFAULT_PROVIDER || 'stub';

/**
 * OpenAI embedding model.
 * @env OPENAI_EMBEDDING_MODEL
 */
export const OPENAI_EMBEDDING_MODEL =
  process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';

/**
 * Number of top documents to retrieve in semantic search.
 * @env EMBEDDING_TOP_K
 */
export const EMBEDDING_TOP_K = parseInt(process.env.EMBEDDING_TOP_K || '10', 10);

/**
 * Semantic vs keyword weight (0-1, default 0.7 = 70% semantic).
 * @env EMBEDDING_HYBRID_WEIGHT
 */
export const EMBEDDING_HYBRID_WEIGHT = parseFloat(process.env.EMBEDDING_HYBRID_WEIGHT || '0.7');

/**
 * Minimum combined score threshold for search results.
 * Results below this score are filtered as noise.
 * @env EMBEDDING_MIN_SCORE
 */
export const EMBEDDING_MIN_SCORE = parseFloat(process.env.EMBEDDING_MIN_SCORE || '0.35');

/**
 * Similarity floor for score normalization.
 * Stretches practical range [floor, 1.0] → [0.0, 1.0] for better differentiation.
 * @env EMBEDDING_SIMILARITY_FLOOR
 */
export const EMBEDDING_SIMILARITY_FLOOR = parseFloat(
  process.env.EMBEDDING_SIMILARITY_FLOOR || '0.3',
);

/**
 * Rate limit for embedding operations per project per minute.
 * @env EMBEDDING_RATE_LIMIT_PER_MINUTE
 */
export const EMBEDDING_RATE_LIMIT_PER_MINUTE = parseInt(
  process.env.EMBEDDING_RATE_LIMIT_PER_MINUTE || '60',
  10,
);

/**
 * Max batch size for backfill operations.
 * @env EMBEDDING_MAX_BATCH_SIZE
 */
export const EMBEDDING_MAX_BATCH_SIZE = parseInt(process.env.EMBEDDING_MAX_BATCH_SIZE || '100', 10);

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Whether audit logging is enabled.
 * Defaults to false for gradual rollout.
 * @env AUDIT_LOG_ENABLED
 */
export const AUDIT_LOG_ENABLED = process.env.AUDIT_LOG_ENABLED === 'true';

/**
 * Audit log retention period in days.
 * Logs older than this will be deleted by the cleanup job.
 * Default: 365 days.
 * @env AUDIT_LOG_RETENTION_DAYS
 */
export const AUDIT_LOG_RETENTION_DAYS = parseInt(process.env.AUDIT_LOG_RETENTION_DAYS || '365', 10);

/**
 * Audit log cleanup interval in milliseconds.
 * How often the cleanup job runs to delete old logs.
 * Default: 86400000 (24 hours).
 * @env AUDIT_LOG_CLEANUP_INTERVAL_MS
 */
export const AUDIT_LOG_CLEANUP_INTERVAL_MS = parseInt(
  process.env.AUDIT_LOG_CLEANUP_INTERVAL_MS || '86400000',
  10,
);

/**
 * Batch size for audit log cleanup operations.
 * Logs are deleted in batches to avoid long-running transactions.
 * Default: 1000 records per batch.
 * @env AUDIT_LOG_BATCH_DELETE_SIZE
 */
export const AUDIT_LOG_BATCH_DELETE_SIZE = parseInt(
  process.env.AUDIT_LOG_BATCH_DELETE_SIZE || '1000',
  10,
);

/**
 * Maximum number of audit log entries to export at once.
 * Used by the export endpoint to limit memory usage.
 * Default: 10000 records.
 * @env AUDIT_LOG_EXPORT_MAX_LIMIT
 */
export const AUDIT_LOG_EXPORT_MAX_LIMIT = parseInt(
  process.env.AUDIT_LOG_EXPORT_MAX_LIMIT || '10000',
  10,
);
