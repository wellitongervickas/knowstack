/**
 * Query Response DTO.
 * Structure returned by POST /query endpoint.
 */
export class QueryResponseDto {
  /** The AI-generated answer */
  answer!: string;

  /** Documents used to generate the answer */
  sources!: QuerySourceDto[];

  /** Usage metrics */
  usage!: QueryUsageDto;

  /** Metadata about the request */
  meta!: QueryMetaDto;
}

export class QuerySourceDto {
  /** Document ID */
  id!: string;

  /** Document title */
  title!: string;
}

export class QueryUsageDto {
  /** Tokens used in prompt */
  promptTokens!: number;

  /** Tokens used in completion */
  completionTokens!: number;

  /** Total tokens used */
  totalTokens!: number;
}

export class QueryMetaDto {
  /** AI provider used */
  provider!: string;

  /** Model used */
  model!: string;

  /** Processing time in milliseconds */
  latencyMs!: number;

  /** Request ID for correlation (optional for backward compatibility) */
  requestId?: string;

  /** Whether response was served from cache (optional for backward compatibility) */
  cacheHit?: boolean;
}

/**
 * Cached query response structure stored in Redis.
 * Stores the essential response data minus dynamic meta fields
 * (latencyMs, requestId, cacheHit) which are computed per-request.
 * Includes retrievalMeta for header injection on cache hits.
 */
export interface CachedQueryResponse {
  answer: string;
  sources: QuerySourceDto[];
  usage: QueryUsageDto;
  meta: {
    provider: string;
    model: string;
  };
  retrievalMeta?: RetrievalMetadataCache;
}

/**
 * Subset of RetrievalMetadata that is JSON-serializable for Redis caching.
 * All primitive types (strings, numbers, booleans).
 */
export interface RetrievalMetadataCache {
  method: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
  documentsRetrieved: number;
  semanticMatches?: number;
  keywordMatches?: number;
  embeddingTokensUsed?: number;
}
