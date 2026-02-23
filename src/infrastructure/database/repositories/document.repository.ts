import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import {
  IDocumentRepository,
  CreateDocumentInput,
  UpdateDocumentInput,
  KeywordSearchResult,
} from '@/core/interfaces/repositories/document.repository.interface';
import { Document } from '@/core/entities/document.entity';
import { DOCUMENT_SCORING } from '@/application/documents/documents.constants';

@Injectable()
export class DocumentRepository implements IDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProjectId(projectId: string): Promise<Document[]> {
    const documents = await this.prisma.document.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return documents.map(this.mapToEntity);
  }

  async findById(id: string): Promise<Document | null> {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });
    return document ? this.mapToEntity(document) : null;
  }

  async findByIds(ids: string[]): Promise<Document[]> {
    if (ids.length === 0) {
      return [];
    }
    const documents = await this.prisma.document.findMany({
      where: { id: { in: ids } },
    });
    return documents.map(this.mapToEntity);
  }

  async findByContentHash(projectId: string, contentHash: string): Promise<Document | null> {
    const document = await this.prisma.document.findFirst({
      where: { projectId, contentHash },
    });
    return document ? this.mapToEntity(document) : null;
  }

  async findBySourceUrl(projectId: string, sourceUrl: string): Promise<Document | null> {
    const document = await this.prisma.document.findFirst({
      where: { projectId, sourceUrl },
    });
    return document ? this.mapToEntity(document) : null;
  }

  async search(projectId: string, query: string, limit: number): Promise<KeywordSearchResult[]> {
    // Split query into terms, filter out empty strings, but keep terms with 1+ chars
    // (Changed from > 2 to > 0 to allow single-char searches like "C", "Go")
    const searchTerms = query
      .toLowerCase()
      .split(/\s+/)
      .filter((term) => term.length > 0)
      .map((term) => this.escapeLikePattern(term));

    if (searchTerms.length === 0) {
      return [];
    }

    // Parameters layout: $1=projectId, $2=limit, then per-term pairs:
    //   $3=likePat0, $4=rawTerm0, $5=likePat1, $6=rawTerm1, ...
    // LIKE patterns have % wrapping for WHERE; raw terms are for REPLACE scoring.
    const termParams: unknown[] = [];
    searchTerms.forEach((t) => {
      termParams.push(`%${t}%`); // LIKE pattern
      termParams.push(t); // raw term for REPLACE
    });
    const params: unknown[] = [projectId, limit, ...termParams];

    // Build per-term LIKE conditions for WHERE clause (index-friendly filtering)
    const likeConditions = searchTerms
      .map((_, i) => {
        const likeIdx = i * 2 + 3; // $3, $5, $7, ...
        return `(LOWER(title) LIKE $${likeIdx} OR LOWER(content) LIKE $${likeIdx})`;
      })
      .join(' OR ');

    // Build per-term TF scoring expression:
    // For each term: count occurrences via LENGTH/REPLACE idiom, normalize by field length
    const { TITLE_WEIGHT, CONTENT_WEIGHT, TITLE_NORM_LENGTH, CONTENT_NORM_LENGTH } =
      DOCUMENT_SCORING;

    const termScoreExprs = searchTerms.map((_, i) => {
      const rawIdx = i * 2 + 4; // $4, $6, $8, ... (raw terms without %)
      const param = `$${rawIdx}`;
      const termLen = `LENGTH(${param})`;
      // Count occurrences = (original_length - replaced_length) / term_length
      const titleHits = `(LENGTH(LOWER(title)) - LENGTH(REPLACE(LOWER(title), ${param}, ''))) / GREATEST(${termLen}, 1)`;
      const contentHits = `(LENGTH(LOWER(content)) - LENGTH(REPLACE(LOWER(content), ${param}, ''))) / GREATEST(${termLen}, 1)`;
      // Normalize by field length
      const titleScore = `${titleHits}::float / GREATEST(LENGTH(title) / ${TITLE_NORM_LENGTH}.0, 1.0) * ${TITLE_WEIGHT}`;
      const contentScore = `${contentHits}::float / GREATEST(LENGTH(content) / ${CONTENT_NORM_LENGTH}.0, 1.0) * ${CONTENT_WEIGHT}`;
      return `(${titleScore} + ${contentScore})`;
    });

    const scoreExpr = `LEAST((${termScoreExprs.join(' + ')}) / ${searchTerms.length}::float, 1.0)`;

    const sql = `
      SELECT id, ${scoreExpr} AS score
      FROM documents
      WHERE "projectId" = $1
        AND (${likeConditions})
      ORDER BY score DESC, "updatedAt" DESC
      LIMIT $2
    `;

    const results = await this.prisma.$queryRawUnsafe<{ id: string; score: number }[]>(
      sql,
      ...params,
    );

    return results.map((r) => ({
      id: r.id,
      score: Math.round(Number(r.score) * 100) / 100,
    }));
  }

  async create(input: CreateDocumentInput): Promise<Document> {
    const document = await this.prisma.document.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        content: input.content,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl ?? null,
        contentHash: input.contentHash,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      },
    });
    return this.mapToEntity(document);
  }

  async update(id: string, input: UpdateDocumentInput): Promise<Document> {
    const document = await this.prisma.document.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.contentHash !== undefined && {
          contentHash: input.contentHash,
        }),
        ...(input.metadata !== undefined && {
          metadata: input.metadata as Prisma.InputJsonValue,
        }),
      },
    });
    return this.mapToEntity(document);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.document.delete({
      where: { id },
    });
  }

  async deleteByProjectId(projectId: string): Promise<number> {
    const result = await this.prisma.document.deleteMany({
      where: { projectId },
    });
    return result.count;
  }

  /**
   * Escape SQL LIKE metacharacters (%, _, \) in user input.
   * Prevents wildcard injection in LIKE patterns.
   *
   * PostgreSQL LIKE escaping rules:
   * - % is a wildcard (matches any sequence)
   * - _ is a wildcard (matches any single character)
   * - \ is the escape character itself
   *
   * Each metacharacter must be prefixed with backslash:
   * - % becomes \%
   * - _ becomes \_
   * - \ becomes \\ (backslash must be doubled)
   */
  private escapeLikePattern(term: string): string {
    // Escape backslashes first to avoid double-escaping
    // Then escape % and _
    return term
      .replace(/\\/g, '\\\\') // \ → \\
      .replace(/%/g, '\\%') // % → \%
      .replace(/_/g, '\\_'); // _ → \_
  }

  /**
   * Map Prisma document to domain entity.
   * Ensures type safety for metadata JSON field.
   */
  private mapToEntity(
    doc: Awaited<ReturnType<typeof this.prisma.document.findFirst>> & NonNullable<unknown>,
  ): Document {
    return {
      id: doc.id,
      projectId: doc.projectId,
      title: doc.title,
      content: doc.content,
      sourceType: doc.sourceType as Document['sourceType'],
      sourceUrl: doc.sourceUrl,
      contentHash: doc.contentHash,
      metadata: (doc.metadata as Document['metadata']) ?? {},
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
