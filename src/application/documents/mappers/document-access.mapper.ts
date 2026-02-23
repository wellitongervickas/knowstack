/**
 * Document Access mappers.
 *
 * Maps Document entities to response DTOs for the Document Access API.
 * Centralizes mapping logic that was previously co-located with DTO definitions.
 */

import type { Document } from '@/core/entities/document.entity';
import type { DocumentResponseDto } from '@/application/documents/dto/document-response.dto';
import type { DocumentDetailResponseDto } from '@/application/documents/dto/document-detail-response.dto';
import type { DocumentSearchResultDto } from '@/application/documents/dto/document-search-response.dto';
import { DOCUMENT_DEFAULTS } from '@/application/documents/documents.constants';

/**
 * Mapper for Document Access API responses.
 */
export class DocumentAccessMapper {
  /**
   * Map a Document entity to a list item response.
   * Content is truncated to a preview.
   */
  static toListItem(doc: Document): DocumentResponseDto {
    const previewLength = DOCUMENT_DEFAULTS.CONTENT_PREVIEW_LENGTH;
    const suffix = DOCUMENT_DEFAULTS.CONTENT_PREVIEW_SUFFIX;

    return {
      id: doc.id,
      title: doc.title,
      sourceType: doc.sourceType,
      sourceUrl: doc.sourceUrl,
      contentPreview:
        doc.content.slice(0, previewLength) + (doc.content.length > previewLength ? suffix : ''),
      contentHash: doc.contentHash,
      metadata: doc.metadata,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /**
   * Map a Document entity to a full detail response.
   * Includes complete content (no truncation).
   */
  static toDetailResponse(doc: Document): DocumentDetailResponseDto {
    return {
      id: doc.id,
      title: doc.title,
      sourceType: doc.sourceType,
      sourceUrl: doc.sourceUrl,
      content: doc.content,
      contentHash: doc.contentHash,
      metadata: doc.metadata,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  /**
   * Map a Document entity to a search result with relevance score.
   * Content is truncated to a preview.
   */
  static toSearchResult(doc: Document, score: number): DocumentSearchResultDto {
    const previewLength = DOCUMENT_DEFAULTS.CONTENT_PREVIEW_LENGTH;
    const suffix = DOCUMENT_DEFAULTS.CONTENT_PREVIEW_SUFFIX;

    return {
      id: doc.id,
      title: doc.title,
      sourceType: doc.sourceType,
      sourceUrl: doc.sourceUrl,
      contentPreview:
        doc.content.slice(0, previewLength) + (doc.content.length > previewLength ? suffix : ''),
      score,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
