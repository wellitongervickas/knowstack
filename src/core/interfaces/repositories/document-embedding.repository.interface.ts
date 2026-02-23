import { DocumentEmbedding, VectorSearchResult } from '@/core/entities/document-embedding.entity';

/**
 * Input for upserting a document embedding.
 */
export interface UpsertEmbeddingInput {
  documentId: string;
  projectId: string;
  vector: number[];
  contentHash: string;
  model: string;
  inputTokens: number;
}

/**
 * Repository interface for document embedding operations.
 * Infrastructure layer must implement this interface.
 */
export interface IDocumentEmbeddingRepository {
  /**
   * Upsert an embedding for a document.
   * Creates new or updates existing embedding.
   */
  upsert(input: UpsertEmbeddingInput): Promise<DocumentEmbedding>;

  /**
   * Find an embedding by document ID.
   */
  findByDocumentId(documentId: string): Promise<DocumentEmbedding | null>;

  /**
   * Find embeddings by multiple document IDs.
   */
  findByDocumentIds(documentIds: string[]): Promise<DocumentEmbedding[]>;

  /**
   * Find similar documents using vector similarity search.
   * Returns documents ranked by cosine similarity.
   *
   * SECURITY: Always includes projectId filter for tenant isolation.
   */
  findSimilar(projectId: string, vector: number[], limit: number): Promise<VectorSearchResult[]>;

  /**
   * Delete an embedding by document ID.
   */
  deleteByDocumentId(documentId: string): Promise<void>;

  /**
   * Delete all embeddings for a project.
   * Returns count of deleted embeddings.
   */
  deleteByProjectId(projectId: string): Promise<number>;

  /**
   * Count embeddings for a project.
   */
  countByProjectId(projectId: string): Promise<number>;

  /**
   * Find documents that need embedding for a project.
   * Includes documents with no embedding and documents with stale embeddings
   * (where document contentHash differs from embedding contentHash).
   * Used by backfill process.
   */
  findDocumentsNeedingEmbedding(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<{ id: string; contentHash: string }[]>;

  /**
   * Check if pgvector extension is available.
   */
  isPgvectorAvailable(): Promise<boolean>;
}

export const DOCUMENT_EMBEDDING_REPOSITORY = Symbol('DOCUMENT_EMBEDDING_REPOSITORY');
