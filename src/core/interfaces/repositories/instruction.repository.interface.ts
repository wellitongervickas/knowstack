import {
  Instruction,
  InstructionType,
  InstructionMetadata,
} from '@/core/entities/instruction.entity';

/**
 * Input for creating a new instruction.
 */
export interface CreateInstructionInput {
  name: string;
  type: InstructionType;
  visibility: 'PUBLIC' | 'ORGANIZATION' | 'PRIVATE';
  description: string;
  content: string;
  metadata?: InstructionMetadata;
  projectId: string | null;
  organizationId: string | null;
}

/**
 * Input for updating an existing instruction.
 */
export interface UpdateInstructionInput {
  name?: string;
  description?: string;
  content?: string;
  metadata?: InstructionMetadata;
}

/**
 * Repository interface for instruction operations.
 * Infrastructure layer must implement this interface.
 */
export interface IInstructionRepository {
  /**
   * Find all instructions for a project (private only).
   */
  findByProjectId(projectId: string): Promise<Instruction[]>;

  /**
   * Find an instruction by ID.
   */
  findById(id: string): Promise<Instruction | null>;

  /**
   * Find all public instructions of a given type.
   */
  findPublicByType(type: InstructionType): Promise<Instruction[]>;

  /**
   * Find all PRIVATE instructions of a given type for a project.
   * Filters by visibility='PRIVATE' to exclude PUBLIC instructions that share the same projectId.
   */
  findByProjectIdAndType(projectId: string, type: InstructionType): Promise<Instruction[]>;

  /**
   * Find all organization-scoped instructions of a given type.
   */
  findByOrganizationIdAndType(
    organizationId: string,
    type: InstructionType,
  ): Promise<Instruction[]>;

  /**
   * Find an instruction by name, type, and projectId.
   * Used for duplicate detection within project scope.
   */
  findByNameAndType(
    name: string,
    type: InstructionType,
    projectId: string | null,
  ): Promise<Instruction | null>;

  /**
   * Find an instruction by name, type, and organizationId (org scope).
   * Used for duplicate detection within organization scope.
   */
  findByNameAndTypeForOrganization(
    name: string,
    type: InstructionType,
    organizationId: string,
  ): Promise<Instruction | null>;

  /**
   * Create a new instruction.
   */
  create(input: CreateInstructionInput): Promise<Instruction>;

  /**
   * Update an existing instruction.
   */
  update(id: string, input: UpdateInstructionInput): Promise<Instruction>;

  /**
   * Delete an instruction by ID.
   */
  delete(id: string): Promise<void>;
}

export const INSTRUCTION_REPOSITORY = Symbol('INSTRUCTION_REPOSITORY');
