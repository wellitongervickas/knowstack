import { RetrievalMethod } from '@/application/embedding/embedding.constants';

/**
 * Retrieval metadata for response headers.
 * Captures information about how documents were retrieved for a query.
 */
export interface RetrievalMetadata {
  /** Method used for document retrieval */
  method: RetrievalMethod;

  /** Whether fallback to all-docs was triggered */
  fallbackUsed: boolean;

  /** Reason for fallback if triggered */
  fallbackReason?: string;

  /** Number of documents retrieved */
  documentsRetrieved: number;

  /** Count of semantic matches (if hybrid search used) */
  semanticMatches?: number;

  /** Count of keyword matches (if hybrid search used) */
  keywordMatches?: number;

  /** Embedding tokens used for query (if semantic search used) */
  embeddingTokensUsed?: number;
}
