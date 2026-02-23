import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IInstructionRepository,
  INSTRUCTION_REPOSITORY,
} from '@/core/interfaces/repositories/instruction.repository.interface';
import {
  IInstructionEmbeddingRepository,
  INSTRUCTION_EMBEDDING_REPOSITORY,
} from '@/core/interfaces/repositories/instruction-embedding.repository.interface';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
} from '@/core/interfaces/services/observability.interface';
import { InstructionType } from '@/core/entities/instruction.entity';
import { INSTRUCTION_TYPES } from '@/application/instructions/instructions.constants';
import { InstructionEmbeddingService } from './instruction-embedding.service';
import {
  EMBEDDING_DEFAULTS,
  OPENAI_EMBEDDING,
  INSTRUCTION_BACKFILL_DEFAULTS,
} from '@/application/embedding/embedding.constants';
import {
  BackfillProgress,
  InstructionBackfillRequestDto,
  InstructionBackfillResponseDto,
} from '@/application/embedding/dto';

export const INSTRUCTION_BACKFILL_SERVICE = Symbol('INSTRUCTION_BACKFILL_SERVICE');
export type { InstructionBackfillRequestDto, InstructionBackfillResponseDto };

/**
 * Instruction Embedding Backfill Service.
 *
 * Provides batch embedding functionality for existing instructions.
 * Supports dry-run mode for cost estimation.
 */
@Injectable()
export class InstructionBackfillService {
  private readonly maxBatchSize: number;

  constructor(
    @Inject(INSTRUCTION_REPOSITORY)
    private readonly instructionRepository: IInstructionRepository,
    @Inject(INSTRUCTION_EMBEDDING_REPOSITORY)
    private readonly embeddingRepository: IInstructionEmbeddingRepository,
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
    private readonly embeddingService: InstructionEmbeddingService,
    private readonly configService: ConfigService,
  ) {
    this.maxBatchSize =
      this.configService.get<number>('embedding.maxBatchSize') ?? EMBEDDING_DEFAULTS.MAX_BATCH_SIZE;
  }

  /**
   * Run backfill for instructions without embeddings.
   */
  async backfill(
    request: InstructionBackfillRequestDto,
    onProgress?: (progress: BackfillProgress) => void,
  ): Promise<InstructionBackfillResponseDto> {
    const startTime = Date.now();
    const batchSize = Math.min(
      request.batchSize ?? EMBEDDING_DEFAULTS.DEFAULT_BATCH_SIZE,
      this.maxBatchSize,
    );

    const result: InstructionBackfillResponseDto = {
      total: 0,
      embedded: 0,
      skipped: 0,
      failed: 0,
      estimatedCostUsd: 0,
      durationMs: 0,
      errors: [],
    };

    // Get instructions to process
    const allInstructions = request.type
      ? await this.instructionRepository.findByProjectIdAndType(request.projectId, request.type)
      : await this.instructionRepository.findByProjectId(request.projectId);

    // Also include PUBLIC and ORGANIZATION instructions
    const publicInstructions = request.type
      ? await this.instructionRepository.findPublicByType(request.type)
      : await this.getPublicInstructions();
    const orgInstructions = request.type
      ? await this.instructionRepository.findByOrganizationIdAndType(
          request.organizationId,
          request.type,
        )
      : await this.getOrgInstructions(request.organizationId);

    const instructionsToProcess = [...publicInstructions, ...orgInstructions, ...allInstructions];

    // Deduplicate by ID
    const seen = new Set<string>();
    const uniqueInstructions = instructionsToProcess.filter((i) => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });

    // Filter to those needing embedding (unless force regenerate)
    let toEmbed = uniqueInstructions;
    if (!request.forceRegenerate) {
      const ids = uniqueInstructions.map((i) => i.id);
      const needingEmbedding = await this.embeddingRepository.findInstructionsNeedingEmbedding(
        ids,
        INSTRUCTION_BACKFILL_DEFAULTS.MAX_PAGINATION_LIMIT,
      );
      const needingIds = new Set(needingEmbedding.map((n) => n.id));
      toEmbed = uniqueInstructions.filter((i) => needingIds.has(i.id));
    }

    result.total = toEmbed.length;

    // Estimate cost
    const totalEstimatedTokens =
      result.total * INSTRUCTION_BACKFILL_DEFAULTS.AVG_TOKENS_PER_INSTRUCTION;
    result.estimatedCostUsd =
      (totalEstimatedTokens / 1_000_000) * OPENAI_EMBEDDING.COST_PER_MILLION_TOKENS;

    // Dry run - return estimate only
    if (request.dryRun) {
      result.durationMs = Date.now() - startTime;
      return result;
    }

    // Process in batches
    for (let i = 0; i < toEmbed.length; i += batchSize) {
      const batch = toEmbed.slice(i, i + batchSize);

      for (const instruction of batch) {
        try {
          const embedResult = await this.embeddingService.embedInstruction({
            instructionId: instruction.id,
            projectId: instruction.projectId,
            organizationId: instruction.organizationId,
            name: instruction.name,
            description: instruction.description,
            content: instruction.content,
          });

          if (embedResult.success) {
            if (embedResult.action === 'skipped') {
              result.skipped++;
            } else {
              result.embedded++;
            }
          } else {
            result.failed++;
            result.errors?.push({
              instructionId: instruction.id,
              error: this.sanitizeErrorMessage(embedResult.error ?? 'Unknown error'),
            });
          }
        } catch (error) {
          result.failed++;
          result.errors?.push({
            instructionId: instruction.id,
            error: this.sanitizeErrorMessage(
              error instanceof Error ? error.message : 'Unknown error',
            ),
          });
        }
      }

      // Report progress
      if (onProgress) {
        onProgress({
          processed: Math.min(i + batchSize, toEmbed.length),
          total: result.total,
          embedded: result.embedded,
          skipped: result.skipped,
          failed: result.failed,
        });
      }

      this.logger.info(
        `Instruction backfill progress: ${Math.min(i + batchSize, toEmbed.length)}/${result.total}`,
      );
    }

    result.durationMs = Date.now() - startTime;

    this.logger.info('Instruction backfill completed', {
      projectId: request.projectId,
      total: result.total,
      embedded: result.embedded,
      skipped: result.skipped,
      failed: result.failed,
      durationMs: result.durationMs,
    });

    return result;
  }

  /**
   * Get all public instructions (all types).
   */
  private async getPublicInstructions() {
    const types = [...INSTRUCTION_TYPES] as InstructionType[];
    const results = await Promise.all(
      types.map((t) => this.instructionRepository.findPublicByType(t)),
    );
    return results.flat();
  }

  /**
   * Get all organization instructions (all types).
   */
  private async getOrgInstructions(organizationId: string) {
    const types = [...INSTRUCTION_TYPES] as InstructionType[];
    const results = await Promise.all(
      types.map((t) => this.instructionRepository.findByOrganizationIdAndType(organizationId, t)),
    );
    return results.flat();
  }

  /**
   * Sanitize error messages to prevent leaking internal details.
   */
  private sanitizeErrorMessage(message: string): string {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('openai') || lowerMessage.includes('api error'))
      return 'Embedding provider error';
    if (
      lowerMessage.includes('database') ||
      lowerMessage.includes('prisma') ||
      lowerMessage.includes('postgres')
    )
      return 'Storage error';
    if (
      lowerMessage.includes('rate') ||
      lowerMessage.includes('limit') ||
      lowerMessage.includes('throttl')
    )
      return 'Rate limit exceeded';
    if (
      lowerMessage.includes('timeout') ||
      lowerMessage.includes('econnrefused') ||
      lowerMessage.includes('enotfound')
    )
      return 'Service temporarily unavailable';
    return 'Processing failed';
  }
}
