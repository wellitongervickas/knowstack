import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IDocumentRepository,
  DOCUMENT_REPOSITORY,
} from '@/core/interfaces/repositories/document.repository.interface';
import {
  IDocumentEmbeddingRepository,
  DOCUMENT_EMBEDDING_REPOSITORY,
} from '@/core/interfaces/repositories/document-embedding.repository.interface';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
} from '@/core/interfaces/services/observability.interface';
import { DocumentEmbeddingService } from './document-embedding.service';
import {
  BackfillRequestDto,
  BackfillResponseDto,
  BackfillProgress,
} from '@/application/embedding/dto';
import {
  EMBEDDING_DEFAULTS,
  OPENAI_EMBEDDING,
  BACKFILL_DEFAULTS,
} from '@/application/embedding/embedding.constants';

export const EMBEDDING_BACKFILL_SERVICE = Symbol('EMBEDDING_BACKFILL_SERVICE');

/**
 * Embedding Backfill Service.
 *
 * Provides batch embedding functionality for existing documents.
 * Supports dry-run mode for cost estimation.
 */
@Injectable()
export class EmbeddingBackfillService {
  private readonly maxBatchSize: number;

  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
    @Inject(DOCUMENT_EMBEDDING_REPOSITORY)
    private readonly embeddingRepository: IDocumentEmbeddingRepository,
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
    private readonly embeddingService: DocumentEmbeddingService,
    private readonly configService: ConfigService,
  ) {
    this.maxBatchSize =
      this.configService.get<number>('embedding.maxBatchSize') ?? EMBEDDING_DEFAULTS.MAX_BATCH_SIZE;
  }

  /**
   * Run backfill for documents without embeddings.
   *
   * @param request - Backfill configuration
   * @param organizationId - Organization for usage tracking
   * @param onProgress - Optional callback for progress updates
   */
  async backfill(
    request: BackfillRequestDto,
    organizationId: string,
    onProgress?: (progress: BackfillProgress) => void,
  ): Promise<BackfillResponseDto> {
    const startTime = Date.now();
    const batchSize = Math.min(
      request.batchSize ?? EMBEDDING_DEFAULTS.DEFAULT_BATCH_SIZE,
      this.maxBatchSize,
    );

    const result: BackfillResponseDto = {
      found: 0,
      total: 0,
      embedded: 0,
      skipped: 0,
      failed: 0,
      estimatedCostUsd: 0,
      durationMs: 0,
      errors: [],
    };

    // Get documents to process
    const projectId = request.projectId;
    const allDocs = await this.documentRepository.findByProjectId(projectId);
    result.found = allDocs.length;

    let documentsToProcess: { id: string; contentHash: string }[] = [];

    if (request.forceRegenerate) {
      documentsToProcess = allDocs.map((d) => ({ id: d.id, contentHash: d.contentHash }));
    } else {
      documentsToProcess = await this.embeddingRepository.findDocumentsNeedingEmbedding(
        projectId,
        BACKFILL_DEFAULTS.MAX_PAGINATION_LIMIT,
        0,
      );
    }

    result.total = documentsToProcess.length;

    // Estimate cost
    const totalEstimatedTokens = result.total * BACKFILL_DEFAULTS.AVG_TOKENS_PER_DOC;
    result.estimatedCostUsd =
      (totalEstimatedTokens / 1_000_000) * OPENAI_EMBEDDING.COST_PER_MILLION_TOKENS;

    // Dry run - return estimate only
    if (request.dryRun) {
      result.durationMs = Date.now() - startTime;
      return result;
    }

    // Process in batches
    for (let i = 0; i < documentsToProcess.length; i += batchSize) {
      const batch = documentsToProcess.slice(i, i + batchSize);

      for (const doc of batch) {
        try {
          const document = await this.documentRepository.findById(doc.id);
          if (!document) {
            result.skipped++;
            continue;
          }

          // Check if needs embedding (unless force regenerate)
          if (!request.forceRegenerate) {
            const needsEmbed = await this.embeddingService.shouldEmbed(doc.id, doc.contentHash);
            if (!needsEmbed) {
              result.skipped++;
              continue;
            }
          }

          const embedResult = await this.embeddingService.embedDocumentWithTracking(
            {
              documentId: document.id,
              projectId: document.projectId,
              title: document.title,
              content: document.content,
              contentHash: document.contentHash,
            },
            organizationId,
          );

          if (embedResult.success) {
            if (embedResult.action === 'skipped') {
              result.skipped++;
            } else {
              result.embedded++;
            }
          } else {
            result.failed++;
            result.errors?.push({
              documentId: doc.id,
              error: this.sanitizeErrorMessage(embedResult.error ?? 'Unknown error'),
            });
          }
        } catch (error) {
          result.failed++;
          result.errors?.push({
            documentId: doc.id,
            error: this.sanitizeErrorMessage(
              error instanceof Error ? error.message : 'Unknown error',
            ),
          });
        }
      }

      // Report progress
      if (onProgress) {
        onProgress({
          processed: Math.min(i + batchSize, documentsToProcess.length),
          total: result.total,
          embedded: result.embedded,
          skipped: result.skipped,
          failed: result.failed,
        });
      }

      this.logger.info(
        `Backfill progress: ${Math.min(i + batchSize, documentsToProcess.length)}/${result.total}`,
      );
    }

    result.durationMs = Date.now() - startTime;

    this.logger.info('Backfill completed', {
      projectId,
      total: result.total,
      embedded: result.embedded,
      skipped: result.skipped,
      failed: result.failed,
      durationMs: result.durationMs,
    });

    return result;
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

  /**
   * Get backfill statistics for a project.
   * Pending includes documents with no embedding and stale embeddings.
   */
  async getStats(projectId: string): Promise<{
    totalDocuments: number;
    embeddedDocuments: number;
    pendingDocuments: number;
  }> {
    const documents = await this.documentRepository.findByProjectId(projectId);
    const pending = await this.embeddingRepository.findDocumentsNeedingEmbedding(
      projectId,
      BACKFILL_DEFAULTS.MAX_PAGINATION_LIMIT,
      0,
    );

    return {
      totalDocuments: documents.length,
      embeddedDocuments: documents.length - pending.length,
      pendingDocuments: pending.length,
    };
  }
}
