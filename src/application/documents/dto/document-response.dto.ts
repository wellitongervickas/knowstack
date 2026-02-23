/**
 * Response DTO for a single document (list item).
 * Used by both Document Access API and Ingestion API for consistent document representation.
 */
export interface DocumentResponseDto {
  id: string;
  title: string;
  sourceType: 'MANUAL' | 'URL';
  sourceUrl: string | null;
  contentPreview: string;
  contentHash: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
