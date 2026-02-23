/**
 * Instruction Embedding domain entity.
 * Represents a vector embedding for an instruction, used for semantic search.
 */
export interface InstructionEmbedding {
  id: string;
  instructionId: string;
  projectId: string | null;
  organizationId: string | null;
  embedding: number[];
  contentHash: string;
  model: string;
  inputTokens: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Result from instruction vector similarity search.
 */
export interface InstructionVectorSearchResult {
  instructionId: string;
  similarity: number;
}
