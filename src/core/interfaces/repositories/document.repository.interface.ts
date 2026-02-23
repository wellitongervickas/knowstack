import { Document, SourceType, DocumentMetadata } from '@/core/entities/document.entity';

/**
 * Input for creating a new document.
 */
export interface CreateDocumentInput {
  projectId: string;
  title: string;
  content: string;
  sourceType: SourceType;
  sourceUrl?: string | null;
  contentHash: string;
  metadata?: DocumentMetadata;
}

/**
 * Input for updating an existing document.
 */
export interface UpdateDocumentInput {
  title?: string;
  content?: string;
  contentHash?: string;
  metadata?: DocumentMetadata;
}

/**
 * Result from keyword search.
 */
export interface KeywordSearchResult {
  id: string;
  score: number;
}

/**
 * Repository interface for document operations.
 * Infrastructure layer must implement this interface.
 */
export interface IDocumentRepository {
  /**
   * Find all documents for a project.
   */
  findByProjectId(projectId: string): Promise<Document[]>;

  /**
   * Find a document by ID.
   */
  findById(id: string): Promise<Document | null>;

  /**
   * Find documents by multiple IDs.
   */
  findByIds(ids: string[]): Promise<Document[]>;

  /**
   * Find a document by content hash within a project.
   * Used for deduplication.
   */
  findByContentHash(projectId: string, contentHash: string): Promise<Document | null>;

  /**
   * Find a document by source URL within a project.
   * Used for update detection.
   */
  findBySourceUrl(projectId: string, sourceUrl: string): Promise<Document | null>;

  /**
   * Search documents by keyword (title and content).
   * Used for hybrid search.
   */
  search(projectId: string, query: string, limit: number): Promise<KeywordSearchResult[]>;

  /**
   * Create a new document.
   */
  create(input: CreateDocumentInput): Promise<Document>;

  /**
   * Update an existing document.
   */
  update(id: string, input: UpdateDocumentInput): Promise<Document>;

  /**
   * Delete a document by ID.
   */
  delete(id: string): Promise<void>;

  /**
   * Delete all documents for a project.
   * Returns count of deleted documents.
   */
  deleteByProjectId(projectId: string): Promise<number>;
}

export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
