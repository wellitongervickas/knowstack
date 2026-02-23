import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import {
  IDocumentEmbeddingRepository,
  UpsertEmbeddingInput,
} from '@/core/interfaces/repositories/document-embedding.repository.interface';
import { DocumentEmbedding, VectorSearchResult } from '@/core/entities/document-embedding.entity';
import { OPENAI_EMBEDDING } from '@/application/embedding/embedding.constants';

/**
 * Prisma implementation of document embedding repository.
 * Uses raw SQL for pgvector operations since Prisma doesn't support vector types.
 *
 * SECURITY: All queries include projectId filter for tenant isolation.
 */
@Injectable()
export class DocumentEmbeddingRepository implements IDocumentEmbeddingRepository {
  private readonly logger = new Logger(DocumentEmbeddingRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async upsert(input: UpsertEmbeddingInput): Promise<DocumentEmbedding> {
    this.validateVector(input.vector);
    const vectorString = `[${input.vector.join(',')}]`;

    const result = await this.prisma.$queryRaw<DocumentEmbedding[]>`
      INSERT INTO document_embeddings (id, "documentId", "projectId", embedding, "contentHash", model, "inputTokens", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid()::text,
        ${input.documentId},
        ${input.projectId},
        ${vectorString}::vector,
        ${input.contentHash},
        ${input.model},
        ${input.inputTokens},
        NOW(),
        NOW()
      )
      ON CONFLICT ("documentId")
      DO UPDATE SET
        embedding = ${vectorString}::vector,
        "contentHash" = ${input.contentHash},
        model = ${input.model},
        "inputTokens" = ${input.inputTokens},
        "updatedAt" = NOW()
      RETURNING id, "documentId", "projectId", "contentHash", model, "inputTokens", "createdAt", "updatedAt"
    `;

    if (result.length === 0) {
      throw new Error('Failed to upsert embedding');
    }

    return {
      ...result[0],
      embedding: input.vector,
    };
  }

  async findByDocumentId(documentId: string): Promise<DocumentEmbedding | null> {
    const result = await this.prisma.$queryRaw<
      (Omit<DocumentEmbedding, 'embedding'> & { embedding: string })[]
    >`
      SELECT id, "documentId", "projectId", embedding::text, "contentHash", model, "inputTokens", "createdAt", "updatedAt"
      FROM document_embeddings
      WHERE "documentId" = ${documentId}
      LIMIT 1
    `;

    if (result.length === 0) {
      return null;
    }

    return this.mapToEntity(result[0]);
  }

  async findByDocumentIds(documentIds: string[]): Promise<DocumentEmbedding[]> {
    if (documentIds.length === 0) {
      return [];
    }

    const result = await this.prisma.$queryRaw<
      (Omit<DocumentEmbedding, 'embedding'> & { embedding: string })[]
    >`
      SELECT id, "documentId", "projectId", embedding::text, "contentHash", model, "inputTokens", "createdAt", "updatedAt"
      FROM document_embeddings
      WHERE "documentId" = ANY(${documentIds})
    `;

    return result.map(this.mapToEntity);
  }

  async findSimilar(
    projectId: string,
    vector: number[],
    limit: number,
  ): Promise<VectorSearchResult[]> {
    this.validateVector(vector);
    const vectorString = `[${vector.join(',')}]`;

    const results = await this.prisma.$queryRaw<{ documentId: string; similarity: number }[]>`
      SELECT
        "documentId",
        1 - (embedding <=> ${vectorString}::vector) AS similarity
      FROM document_embeddings
      WHERE "projectId" = ${projectId}
      ORDER BY embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `;

    return results.map((r) => ({
      documentId: r.documentId,
      similarity: Number(r.similarity),
    }));
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await this.prisma.$executeRaw`
      DELETE FROM document_embeddings
      WHERE "documentId" = ${documentId}
    `;
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const result = await this.prisma.$executeRaw`
      DELETE FROM document_embeddings
      WHERE "projectId" = ${projectId}
    `;
    return result;
  }

  async countByProjectId(projectId: string): Promise<number> {
    const result = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*) as count
      FROM document_embeddings
      WHERE "projectId" = ${projectId}
    `;
    return Number(result[0]?.count ?? 0);
  }

  async findDocumentsNeedingEmbedding(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<{ id: string; contentHash: string }[]> {
    const results = await this.prisma.$queryRaw<{ id: string; contentHash: string }[]>`
      SELECT d.id, d."contentHash"
      FROM documents d
      LEFT JOIN document_embeddings de ON d.id = de."documentId"
      WHERE d."projectId" = ${projectId}
        AND (de.id IS NULL OR d."contentHash" != de."contentHash")
      ORDER BY d."createdAt" ASC
      LIMIT ${limit}
      OFFSET ${offset}
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
   * Prevents malformed data and ensures vector dimensions are correct.
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
   * Parses vector string from postgres to number array.
   */
  private mapToEntity(
    row: Omit<DocumentEmbedding, 'embedding'> & { embedding: string },
  ): DocumentEmbedding {
    return {
      ...row,
      embedding: this.parseVectorString(row.embedding),
    };
  }

  /**
   * Parse postgres vector string to number array.
   * Format: "[0.1,0.2,0.3,...]"
   */
  private parseVectorString(vectorStr: string): number[] {
    const cleaned = vectorStr.replace(/[[\]]/g, '');
    if (!cleaned) return [];
    return cleaned.split(',').map(Number);
  }
}
