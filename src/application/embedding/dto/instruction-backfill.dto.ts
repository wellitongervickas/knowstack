import { InstructionType } from '@/core/entities/instruction.entity';

/**
 * Request DTO for instruction backfill operations.
 */
export interface InstructionBackfillRequestDto {
  projectId: string;
  organizationId: string;
  type?: InstructionType;
  batchSize?: number;
  dryRun?: boolean;
  forceRegenerate?: boolean;
}

/**
 * Response DTO for instruction backfill operations.
 */
export interface InstructionBackfillResponseDto {
  found: number;
  total: number;
  embedded: number;
  skipped: number;
  failed: number;
  estimatedCostUsd: number;
  durationMs: number;
  errors?: Array<{ instructionId: string; error: string }>;
}
