/**
 * Instruction type for categorizing instruction purpose.
 */
export type InstructionType = 'AGENT' | 'COMMAND' | 'MEMORY' | 'SKILL' | 'TEMPLATE';

/**
 * Instruction visibility for controlling access scope.
 */
export type InstructionVisibility = 'PUBLIC' | 'ORGANIZATION' | 'PRIVATE';

/**
 * Extensible metadata for instructions.
 */
export interface InstructionMetadata {
  /** Recommended AI model for this instruction */
  model?: string;
  /** Tags for categorization */
  tags?: string[];
  /** Allow additional metadata fields */
  [key: string]: unknown;
}

/**
 * Instruction domain entity.
 * Represents an AI instruction (agent, command, memory, or skill) within the system.
 */
export interface Instruction {
  id: string;
  name: string;
  type: InstructionType;
  visibility: InstructionVisibility;
  description: string;
  content: string;
  metadata: InstructionMetadata;
  projectId: string | null;
  organizationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
