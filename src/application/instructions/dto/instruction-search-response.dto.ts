import type { InstructionType, InstructionVisibility } from '@/core/entities/instruction.entity';

/**
 * Single search result for instruction keyword search.
 * Lightweight shape — no content body.
 */
export interface InstructionSearchResultDto {
  name: string;
  type: InstructionType;
  visibility: InstructionVisibility;
  description: string;
  score: number;
}

/**
 * Response shape for instruction keyword search.
 */
export interface InstructionSearchResponseDto {
  results: InstructionSearchResultDto[];
  total: number;
  query: string;
}
