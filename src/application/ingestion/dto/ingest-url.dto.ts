import { IsString, IsUrl, IsOptional, MaxLength, IsNotEmpty } from 'class-validator';

/**
 * Request DTO for URL-based document ingestion.
 */
export class IngestUrlDto {
  @IsUrl()
  @IsNotEmpty()
  @MaxLength(2048)
  sourceUrl!: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string; // Optional override for extracted title
}
