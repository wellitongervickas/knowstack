import { IsOptional, IsNotEmpty, IsInt, Min, Max, IsBoolean, IsString } from 'class-validator';

/**
 * Request DTO for backfill endpoint.
 */
export class BackfillRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'projectId is required' })
  projectId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  batchSize?: number;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;

  @IsOptional()
  @IsBoolean()
  forceRegenerate?: boolean;
}

/**
 * Response DTO for backfill endpoint.
 */
export interface BackfillResponseDto {
  total: number;
  embedded: number;
  skipped: number;
  failed: number;
  estimatedCostUsd: number;
  durationMs: number;
  errors?: Array<{ documentId: string; error: string }>;
}

/**
 * Progress callback for backfill operations.
 */
export interface BackfillProgress {
  processed: number;
  total: number;
  embedded: number;
  skipped: number;
  failed: number;
}
