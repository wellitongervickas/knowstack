/**
 * Embedding module constants and error codes.
 */

// ============= Error Codes =============

/**
 * Internal error codes for logging and debugging.
 * SECURITY: These codes are for INTERNAL logging only.
 * Client-facing errors should use generic messages to avoid infrastructure disclosure.
 */
export const EMBEDDING_ERROR_CODES = {
  EMBEDDING_API_ERROR: 'EMBEDDING_API_ERROR',
  EMBEDDING_NOT_CONFIGURED: 'EMBEDDING_NOT_CONFIGURED',
  EMBEDDING_RATE_LIMITED: 'EMBEDDING_RATE_LIMITED',
  EMBEDDING_TOKEN_LIMIT_EXCEEDED: 'EMBEDDING_TOKEN_LIMIT_EXCEEDED',
  EMBEDDING_DISABLED: 'EMBEDDING_DISABLED',
  VECTOR_SEARCH_FAILED: 'VECTOR_SEARCH_FAILED',
  PGVECTOR_NOT_INSTALLED: 'PGVECTOR_NOT_INSTALLED',
} as const;

export type EmbeddingErrorCode = (typeof EMBEDDING_ERROR_CODES)[keyof typeof EMBEDDING_ERROR_CODES];

/**
 * Client-facing error messages (generic, no infrastructure details).
 */
export const EMBEDDING_CLIENT_ERRORS = {
  SEARCH_UNAVAILABLE: 'Search service temporarily unavailable',
  RATE_LIMITED: 'Too many requests, please try again later',
  PROCESSING_FAILED: 'Unable to process request',
} as const;

// ============= Configuration Defaults =============

export const EMBEDDING_DEFAULTS = {
  TOP_K: 10,
  MAX_TOP_K: 50,
  MIN_TOP_K: 1,
  HYBRID_WEIGHT: 0.7,
  MIN_SCORE: 0.35,
  SIMILARITY_FLOOR: 0.3,
  RATE_LIMIT_PER_MINUTE: 60,
  MAX_BATCH_SIZE: 100,
  DEFAULT_BATCH_SIZE: 50,
} as const;

// ============= OpenAI Embedding Specifics =============

export const OPENAI_EMBEDDING = {
  MODEL: 'text-embedding-3-small',
  DIMENSIONS: 1536,
  MAX_TOKENS: 8191,
  COST_PER_MILLION_TOKENS: 0.02,
} as const;

// ============= Usage Operation Types =============

export const EMBEDDING_OPERATIONS = {
  QUERY_EMBEDDING: 'embedding',
  DOCUMENT_EMBEDDING: 'document_embedding',
  INSTRUCTION_EMBEDDING: 'instruction_embedding',
} as const;

export type EmbeddingOperation = (typeof EMBEDDING_OPERATIONS)[keyof typeof EMBEDDING_OPERATIONS];

// ============= Search Types =============

export const SEARCH_MATCH_TYPES = {
  SEMANTIC: 'semantic',
  KEYWORD: 'keyword',
  HYBRID: 'hybrid',
} as const;

export type SearchMatchType = (typeof SEARCH_MATCH_TYPES)[keyof typeof SEARCH_MATCH_TYPES];

// ============= Retrieval Methods =============

export const RETRIEVAL_METHODS = {
  HYBRID: 'hybrid',
  ALL_DOCS: 'all-docs',
} as const;

export type RetrievalMethod = (typeof RETRIEVAL_METHODS)[keyof typeof RETRIEVAL_METHODS];

// ============= Backfill Defaults =============

export const BACKFILL_DEFAULTS = {
  /** Average estimated tokens per document for cost estimation */
  AVG_TOKENS_PER_DOC: 500,
  /** Maximum pagination limit for backfill document discovery */
  MAX_PAGINATION_LIMIT: 1000,
} as const;

// ============= Instruction Backfill Defaults =============

export const INSTRUCTION_BACKFILL_DEFAULTS = {
  /** Average estimated tokens per instruction for cost estimation */
  AVG_TOKENS_PER_INSTRUCTION: 300,
  /** Maximum pagination limit for backfill instruction discovery */
  MAX_PAGINATION_LIMIT: 1000,
} as const;

// ============= Provider Defaults =============

/**
 * Fallback provider name when no default is configured.
 */
export const DEFAULT_PROVIDER_NAME = 'stub';

// ============= CLS Keys =============

/**
 * CLS key for storing retrieval metadata in request context.
 */
export const RETRIEVAL_META_CLS_KEY = 'retrievalMeta';
