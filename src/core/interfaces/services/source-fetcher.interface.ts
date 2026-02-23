import { SourceType, DocumentMetadata } from '@/core/entities/document.entity';

/**
 * Fetched document data from external source.
 */
export interface FetchedDocument {
  title: string;
  content: string;
  sourceUrl: string;
  metadata?: DocumentMetadata;
}

/**
 * Result of a fetch operation.
 */
export interface FetchResult {
  success: boolean;
  document?: FetchedDocument;
  error?: string;
}

/**
 * Interface for source fetchers.
 * Each fetcher handles a specific source type.
 */
export interface ISourceFetcher {
  /**
   * The source type this fetcher handles.
   */
  readonly sourceType: SourceType;

  /**
   * Fetch content from the source URL.
   * Never throws - returns FetchResult with success=false on error.
   *
   * @param sourceUrl - The URL to fetch from
   */
  fetch(sourceUrl: string): Promise<FetchResult>;
}

export const URL_FETCHER = Symbol('URL_FETCHER');
