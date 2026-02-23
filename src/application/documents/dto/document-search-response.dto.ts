export interface DocumentSearchResultDto {
  id: string;
  title: string;
  sourceType: 'MANUAL' | 'URL';
  sourceUrl: string | null;
  contentPreview: string;
  score: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSearchResponseDto {
  results: DocumentSearchResultDto[];
  total: number;
  query: string;
}
