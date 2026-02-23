import { DomainException } from './domain.exception';

/**
 * Thrown when an instruction is not found or cross-tenant access is attempted.
 * Uses a static message to prevent leaking instruction identifiers in API responses.
 */
export class InstructionNotFoundException extends DomainException {
  constructor(_identifier?: string) {
    super('Instruction not found', 'INSTRUCTION_NOT_FOUND');
    this.name = 'InstructionNotFoundException';
  }
}

/**
 * Thrown when attempting to create an instruction with a duplicate name+type
 * within the same scope (project or organization).
 */
export class InstructionDuplicateException extends DomainException {
  constructor() {
    super(
      'An instruction with the same name and type already exists in this scope',
      'INSTRUCTION_DUPLICATE',
    );
    this.name = 'InstructionDuplicateException';
  }
}

/**
 * Thrown when attempting to create a PUBLIC instruction via API.
 * PUBLIC instructions can only be created via seed script.
 */
export class InstructionVisibilityForbiddenException extends DomainException {
  constructor() {
    super(
      'PUBLIC instructions can only be created via seed script',
      'INSTRUCTION_VISIBILITY_FORBIDDEN',
    );
    this.name = 'InstructionVisibilityForbiddenException';
  }
}

/**
 * Thrown when a memory entry is not found by name within a project.
 */
export class MemoryEntryNotFoundException extends DomainException {
  constructor(name: string) {
    super(`Memory entry '${name}' not found`, 'MEMORY_ENTRY_NOT_FOUND');
    this.name = 'MemoryEntryNotFoundException';
  }
}

/**
 * Thrown when a str_replace operation on memory content fails
 * (old_str not found or matches multiple times).
 */
export class MemoryContentReplaceException extends DomainException {
  constructor(message: string) {
    super(message, 'MEMORY_CONTENT_REPLACE_ERROR');
    this.name = 'MemoryContentReplaceException';
  }
}
