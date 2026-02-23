export interface DocumentDetailResponseDto {
  id: string;
  title: string;
  sourceType: 'MANUAL' | 'URL';
  sourceUrl: string | null;
  content: string;
  contentHash: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}
