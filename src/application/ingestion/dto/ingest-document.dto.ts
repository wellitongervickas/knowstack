import { SourceType, DocumentMetadata } from '@/core/entities/document.entity';

/**
 * Input for ingesting a document directly.
 */
export interface IngestDocumentInput {
  projectId: string;
  title: string;
  content: string;
  sourceType: SourceType;
  sourceUrl?: string;
  metadata?: DocumentMetadata;
  /** Optional organizationId for usage tracking (embedding tokens) */
  organizationId?: string;
}

/**
 * Input for ingesting from an external source.
 */
export interface IngestFromSourceInput {
  projectId: string;
  sourceType: 'URL';
  sourceUrl: string;
  /**
   * Optional title override. When provided, takes precedence over
   * the title extracted by the source fetcher.
   */
  title?: string;
  /** Optional organizationId for usage tracking (embedding tokens) */
  organizationId?: string;
}

/**
 * Result of an ingestion operation.
 */
export interface IngestResult {
  success: boolean;
  documentId?: string;
  action: 'created' | 'updated' | 'unchanged' | 'failed';
  error?: string;
}
