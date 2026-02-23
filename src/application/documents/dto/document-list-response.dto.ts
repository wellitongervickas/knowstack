import type { DocumentResponseDto } from '@/application/documents/dto/document-response.dto';

export interface DocumentPaginationDto {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedDocumentListResponseDto {
  data: DocumentResponseDto[];
  pagination: DocumentPaginationDto;
}
