import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IEmbeddingProvider,
  EMBEDDING_PROVIDER,
} from '@/core/interfaces/services/embedding-provider.interface';
import {
  IInstructionEmbeddingRepository,
  INSTRUCTION_EMBEDDING_REPOSITORY,
} from '@/core/interfaces/repositories/instruction-embedding.repository.interface';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
} from '@/core/interfaces/services/observability.interface';
import {
  EmbedInstructionInput,
  EmbedInstructionResult,
} from '@/application/embedding/dto/embed-instruction.dto';
import { OPENAI_EMBEDDING } from '@/application/embedding/embedding.constants';
import { computeContentHash } from '@/common/utils/crypto.util';

export const INSTRUCTION_EMBEDDING_SERVICE = Symbol('INSTRUCTION_EMBEDDING_SERVICE');

/**
 * Instruction Embedding Service.
 *
 * Orchestrates embedding operations for instructions:
 * - Hash-based skip logic (don't re-embed unchanged content)
 * - Embedding generation via provider
 * - Storage in vector database
 * - Usage tracking
 */
@Injectable()
export class InstructionEmbeddingService {
  private readonly enabled: boolean;
  private readonly maxTokens: number;

  constructor(
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: IEmbeddingProvider,
    @Inject(INSTRUCTION_EMBEDDING_REPOSITORY)
    private readonly embeddingRepository: IInstructionEmbeddingRepository,
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('embedding.enabled') ?? true;
    this.maxTokens =
      this.configService.get<number>('embedding.openai.maxTokens') ?? OPENAI_EMBEDDING.MAX_TOKENS;
  }

  /**
   * Embed an instruction.
   *
   * - Skips if embedding feature is disabled
   * - Skips if content hash matches existing embedding
   * - Creates or updates embedding
   * - Tracks usage
   */
  async embedInstruction(input: EmbedInstructionInput): Promise<EmbedInstructionResult> {
    if (!this.enabled) {
      this.logger.debug('Instruction embedding skipped: feature disabled', {
        instructionId: input.instructionId,
      });
      return {
        success: true,
        instructionId: input.instructionId,
        action: 'skipped',
      };
    }

    try {
      const textToEmbed = this.prepareTextForEmbedding(
        input.name,
        input.description,
        input.content,
      );
      const contentHash = computeContentHash(textToEmbed);

      // Check if embedding already exists with same content hash
      const existing = await this.embeddingRepository.findByInstructionId(input.instructionId);

      if (existing && existing.contentHash === contentHash) {
        this.logger.debug('Instruction embedding skipped: content unchanged', {
          instructionId: input.instructionId,
          contentHash,
        });
        return {
          success: true,
          instructionId: input.instructionId,
          action: 'skipped',
        };
      }

      // Generate embedding
      const embeddingResult = await this.embeddingProvider.embed(textToEmbed);

      // Store embedding
      await this.embeddingRepository.upsert({
        instructionId: input.instructionId,
        projectId: input.projectId,
        organizationId: input.organizationId,
        vector: embeddingResult.vector,
        contentHash,
        model: embeddingResult.model,
        inputTokens: embeddingResult.usage.totalTokens,
      });

      const action = existing ? 'updated' : 'created';

      this.logger.info(`Instruction embedding ${action}`, {
        instructionId: input.instructionId,
        model: embeddingResult.model,
        tokensUsed: embeddingResult.usage.totalTokens,
      });

      return {
        success: true,
        instructionId: input.instructionId,
        action,
        tokensUsed: embeddingResult.usage.totalTokens,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Instruction embedding failed', error as Error, {
        instructionId: input.instructionId,
      });

      return {
        success: false,
        instructionId: input.instructionId,
        action: 'failed',
        error: message,
      };
    }
  }

  /**
   * Check if instruction needs embedding.
   */
  async shouldEmbed(
    instructionId: string,
    name: string,
    description: string,
    content: string,
  ): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const textToEmbed = this.prepareTextForEmbedding(name, description, content);
    const contentHash = computeContentHash(textToEmbed);

    const existing = await this.embeddingRepository.findByInstructionId(instructionId);

    if (!existing) {
      return true;
    }

    return existing.contentHash !== contentHash;
  }

  /**
   * Delete embedding for an instruction.
   */
  async deleteEmbedding(instructionId: string): Promise<void> {
    await this.embeddingRepository.deleteByInstructionId(instructionId);
  }

  /**
   * Check if embedding feature is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Prepare text for embedding.
   * Combines name, description, and content; truncates if necessary.
   */
  private prepareTextForEmbedding(name: string, description: string, content: string): string {
    const combined = `${name}\n\n${description}\n\n${content}`;
    const estimatedTokens = Math.ceil(combined.length / 4);

    if (estimatedTokens > this.maxTokens) {
      const maxChars = this.maxTokens * 4;
      this.logger.warn(
        `Instruction truncated for embedding: ${estimatedTokens} estimated tokens (max: ${this.maxTokens})`,
      );
      return combined.slice(0, maxChars);
    }

    return combined;
  }
}
