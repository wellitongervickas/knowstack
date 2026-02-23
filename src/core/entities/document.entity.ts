/**
 * Source type for document ingestion.
 */
export type SourceType = 'MANUAL' | 'URL';

/**
 * Extensible metadata for documents.
 */
export interface DocumentMetadata {
  /** ISO timestamp when content was fetched */
  fetchedAt?: string;
  /** Content-Type header from URL fetch */
  contentType?: string;
  /** Allow additional metadata fields */
  [key: string]: unknown;
}

/**
 * Document domain entity.
 * Represents a documentation item within a project.
 */
export interface Document {
  id: string;
  projectId: string;
  title: string;
  content: string;
  sourceType: SourceType;
  sourceUrl: string | null;
  contentHash: string;
  metadata: DocumentMetadata;
  createdAt: Date;
  updatedAt: Date;
  /** Optional: true if document has an associated embedding */
  hasEmbedding?: boolean;
}
