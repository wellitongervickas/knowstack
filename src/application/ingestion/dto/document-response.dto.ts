import type { DocumentResponseDto } from '@/application/documents/dto/document-response.dto';

/**
 * Response DTO for document list (ingestion API).
 */
export interface DocumentListResponseDto {
  documents: DocumentResponseDto[];
  total: number;
}

/**
 * Response DTO for ingestion operations.
 */
export interface IngestResponseDto {
  success: boolean;
  documentId?: string;
  action: 'created' | 'updated' | 'unchanged' | 'failed';
  error?: string;
}
