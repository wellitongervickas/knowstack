import { DomainException } from './domain.exception';

/**
 * Base embedding exception.
 * All embedding-specific exceptions should extend this class.
 */
export class EmbeddingException extends DomainException {
  constructor(message: string, code: string) {
    super(message, code);
    this.name = 'EmbeddingException';
  }
}

/**
 * Thrown when embedding API call fails.
 */
export class EmbeddingApiException extends EmbeddingException {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message, 'EMBEDDING_API_ERROR');
    this.name = 'EmbeddingApiException';
  }
}

/**
 * Thrown when embedding provider is not configured.
 */
export class EmbeddingNotConfiguredException extends EmbeddingException {
  constructor(message = 'Embedding provider not configured') {
    super(message, 'EMBEDDING_NOT_CONFIGURED');
    this.name = 'EmbeddingNotConfiguredException';
  }
}

/**
 * Thrown when embedding rate limit is exceeded.
 */
export class EmbeddingRateLimitedException extends EmbeddingException {
  constructor(message = 'Embedding rate limit exceeded') {
    super(message, 'EMBEDDING_RATE_LIMITED');
    this.name = 'EmbeddingRateLimitedException';
  }
}

/**
 * Thrown when document exceeds token limit for embedding.
 */
export class EmbeddingTokenLimitExceededException extends EmbeddingException {
  constructor(
    public readonly tokenCount: number,
    public readonly maxTokens: number,
  ) {
    super(
      `Document exceeds embedding token limit: ${tokenCount} tokens (max: ${maxTokens})`,
      'EMBEDDING_TOKEN_LIMIT_EXCEEDED',
    );
    this.name = 'EmbeddingTokenLimitExceededException';
  }
}

/**
 * Thrown when embedding feature is disabled.
 */
export class EmbeddingDisabledException extends EmbeddingException {
  constructor(message = 'Embedding feature is disabled') {
    super(message, 'EMBEDDING_DISABLED');
    this.name = 'EmbeddingDisabledException';
  }
}

/**
 * Thrown when vector search fails.
 */
export class VectorSearchException extends EmbeddingException {
  constructor(
    message: string,
    public readonly cause?: Error,
  ) {
    super(message, 'VECTOR_SEARCH_FAILED');
    this.name = 'VectorSearchException';
  }
}

/**
 * Thrown when pgvector extension is not installed.
 */
export class PgvectorNotInstalledException extends EmbeddingException {
  constructor(message = 'pgvector extension not installed') {
    super(message, 'PGVECTOR_NOT_INSTALLED');
    this.name = 'PgvectorNotInstalledException';
  }
}
