import type { Instruction } from '@/core/entities/instruction.entity';

export interface InstructionResponseDto {
  id: string;
  name: string;
  type: string;
  visibility: string;
  description: string;
  content: string;
  metadata: Record<string, unknown>;
  projectId: string | null;
  organizationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedInstructionListResponseDto {
  data: InstructionResponseDto[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

/**
 * Map an Instruction entity to the API response shape.
 */
export function mapInstructionToResponse(instruction: Instruction): InstructionResponseDto {
  return {
    id: instruction.id,
    name: instruction.name,
    type: instruction.type,
    visibility: instruction.visibility,
    description: instruction.description,
    content: instruction.content,
    metadata: instruction.metadata as Record<string, unknown>,
    projectId: instruction.projectId,
    organizationId: instruction.organizationId,
    createdAt: instruction.createdAt.toISOString(),
    updatedAt: instruction.updatedAt.toISOString(),
  };
}
