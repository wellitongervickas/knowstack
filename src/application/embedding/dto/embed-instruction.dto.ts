/**
 * Input for embedding an instruction.
 */
export interface EmbedInstructionInput {
  instructionId: string;
  projectId: string | null;
  organizationId: string | null;
  name: string;
  description: string;
  content: string;
}

/**
 * Result of embedding an instruction.
 */
export interface EmbedInstructionResult {
  success: boolean;
  instructionId: string;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  tokensUsed?: number;
  error?: string;
}
