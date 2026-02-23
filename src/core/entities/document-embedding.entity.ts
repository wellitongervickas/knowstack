/**
 * Document Embedding domain entity.
 * Represents a vector embedding for a document, used for semantic search.
 */
export interface DocumentEmbedding {
  id: string;
  documentId: string;
  projectId: string;
  embedding: number[];
  contentHash: string;
  model: string;
  inputTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result from vector similarity search.
 */
export interface VectorSearchResult {
  documentId: string;
  similarity: number;
}

/**
 * Result from keyword search.
 */
export interface KeywordSearchResult {
  id: string;
  score: number;
}
