import { IsString, IsNotEmpty, MaxLength, IsOptional, IsObject } from 'class-validator';

/**
 * Request DTO for manual document ingestion.
 */
export class IngestManualDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1048576) // 1MB
  content!: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
