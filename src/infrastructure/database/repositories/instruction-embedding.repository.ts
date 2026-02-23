import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import {
  IInstructionEmbeddingRepository,
  UpsertInstructionEmbeddingInput,
} from '@/core/interfaces/repositories/instruction-embedding.repository.interface';
import {
  InstructionEmbedding,
  InstructionVectorSearchResult,
} from '@/core/entities/instruction-embedding.entity';
import { OPENAI_EMBEDDING } from '@/application/embedding/embedding.constants';

/**
 * Prisma implementation of instruction embedding repository.
 * Uses raw SQL for pgvector operations since Prisma doesn't support vector types.
 *
 * SECURITY: findSimilar is scoped by a set of instruction IDs,
 * pre-computed by the caller from visibility merge rules.
 */
@Injectable()
export class InstructionEmbeddingRepository implements IInstructionEmbeddingRepository {
  private readonly logger = new Logger(InstructionEmbeddingRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsert(input: UpsertInstructionEmbeddingInput): Promise<InstructionEmbedding> {
    this.validateVector(input.vector);
    const vectorString = `[${input.vector.join(',')}]`;

    const result = await this.prisma.$queryRaw<Omit<InstructionEmbedding, 'embedding'>[]>`
      INSERT INTO instruction_embeddings (id, "instructionId", "projectId", "organizationId", embedding, "contentHash", model, "inputTokens", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${input.instructionId},
        ${input.projectId},
        ${input.organizationId},
        ${vectorString}::vector,
        ${input.contentHash},
        ${input.model},
        ${input.inputTokens},
        NOW(),
        NOW()
      )
      ON CONFLICT ("instructionId")
      DO UPDATE SET
        embedding = ${vectorString}::vector,
        "contentHash" = ${input.contentHash},
        model = ${input.model},
        "inputTokens" = ${input.inputTokens},
        "updatedAt" = NOW()
      RETURNING id, "instructionId", "projectId", "organizationId", "contentHash", model, "inputTokens", "createdAt", "updatedAt"
    `;

    if (result.length === 0) {
      throw new Error('Failed to upsert instruction embedding');
    }

    return {
      ...result[0],
      embedding: input.vector,
    };
  }

  async findByInstructionId(instructionId: string): Promise<InstructionEmbedding | null> {
    const result = await this.prisma.$queryRaw<
      (Omit<InstructionEmbedding, 'embedding'> & { embedding: string })[]
    >`
      SELECT id, "instructionId", "projectId", "organizationId", embedding::text, "contentHash", model, "inputTokens", "createdAt", "updatedAt"
      FROM instruction_embeddings
      WHERE "instructionId" = ${instructionId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findSimilar(
    instructionIds: string[],
    vector: number[],
    limit: number,
  ): Promise<InstructionVectorSearchResult[]> {
    if (instructionIds.length === 0) {
      return [];
    }

    this.validateVector(vector);
    const vectorString = `[${vector.join(',')}]`;

    const results = await this.prisma.$queryRaw<{ instructionId: string; similarity: number }[]>`
      SELECT
        "instructionId",
        1 - (embedding <=> ${vectorString}::vector) AS similarity
      FROM instruction_embeddings
      WHERE "instructionId" = ANY(${instructionIds})
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      instructionId: r.instructionId,
      similarity: Number(r.similarity),
    }));
  }

  async deleteByInstructionId(instructionId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM instruction_embeddings
      WHERE "instructionId" = ${instructionId}
    `;
  }

  async findInstructionsNeedingEmbedding(
    instructionIds: string[],
    limit: number,
  ): Promise<{ id: string; contentHash: string | null }[]> {
    if (instructionIds.length === 0) {
      return [];
    }

    const results = await this.prisma.$queryRaw<{ id: string; contentHash: string | null }[]>`
      SELECT i.id, ie."contentHash"
      FROM instructions i
      LEFT JOIN instruction_embeddings ie ON i.id = ie."instructionId"
      WHERE i.id = ANY(${instructionIds})
        AND ie.id IS NULL
      ORDER BY i."createdAt" ASC
      LIMIT ${limit}
    `;

    return results;
  }

  async isPgvectorAvailable(): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT EXISTS (
          SELECT 1 FROM pg_extension WHERE extname = 'vector'
        ) as exists
      `;
      return result[0]?.exists ?? false;
    } catch (error) {
      this.logger.warn(
        `Failed to check pgvector availability: ${error instanceof Error ? error.message : error}`,
      );
      return false;
    }
  }

  /**
   * Validate vector before SQL construction.
   */
  private validateVector(vector: number[]): void {
    if (vector.length !== OPENAI_EMBEDDING.DIMENSIONS) {
      throw new Error(
        `Invalid vector dimension: ${vector.length}, expected ${OPENAI_EMBEDDING.DIMENSIONS}`,
      );
    }
    if (!vector.every((n) => Number.isFinite(n))) {
      throw new Error('Vector contains non-finite values');
    }
  }

  /**
   * Map database result to entity.
   */
  private mapToEntity(
    row: Omit<InstructionEmbedding, 'embedding'> & { embedding: string },
  ): InstructionEmbedding {
    return {
      ...row,
      embedding: this.parseVectorString(row.embedding),
    };
  }

  /**
   * Parse postgres vector string to number array.
   */
  private parseVectorString(vectorStr: string): number[] {
    const cleaned = vectorStr.replace(/[[\]]/g, '');
    if (!cleaned) return [];
    return cleaned.split(',').map(Number);
  }
}
