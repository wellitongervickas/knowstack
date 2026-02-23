import {
  InstructionEmbedding,
  InstructionVectorSearchResult,
} from '@/core/entities/instruction-embedding.entity';

/**
 * Input for upserting an instruction embedding.
 */
export interface UpsertInstructionEmbeddingInput {
  instructionId: string;
  projectId: string | null;
  organizationId: string | null;
  vector: number[];
  contentHash: string;
  model: string;
  inputTokens: number;
}

/**
 * Repository interface for instruction embedding operations.
 * Infrastructure layer must implement this interface.
 */
export interface IInstructionEmbeddingRepository {
  /**
   * Upsert an embedding for an instruction.
   * Creates new or updates existing embedding.
   */
  upsert(input: UpsertInstructionEmbeddingInput): Promise<InstructionEmbedding>;

  /**
   * Find an embedding by instruction ID.
   */
  findByInstructionId(instructionId: string): Promise<InstructionEmbedding | null>;

  /**
   * Find similar instructions using vector similarity search.
   * Scoped by a set of candidate instruction IDs (pre-computed from visibility merge).
   *
   * SECURITY: Caller must ensure instructionIds are properly access-controlled.
   */
  findSimilar(
    instructionIds: string[],
    vector: number[],
    limit: number,
  ): Promise<InstructionVectorSearchResult[]>;

  /**
   * Delete an embedding by instruction ID.
   */
  deleteByInstructionId(instructionId: string): Promise<void>;

  /**
   * Find instructions that need embedding from a set of instruction IDs.
   * Returns instructions with no embedding or stale embeddings
   * (where content hash differs).
   * Used by backfill process.
   */
  findInstructionsNeedingEmbedding(
    instructionIds: string[],
    limit: number,
  ): Promise<{ id: string; contentHash: string | null }[]>;

  /**
   * Check if pgvector extension is available.
   */
  isPgvectorAvailable(): Promise<boolean>;
}

export const INSTRUCTION_EMBEDDING_REPOSITORY = Symbol('INSTRUCTION_EMBEDDING_REPOSITORY');
