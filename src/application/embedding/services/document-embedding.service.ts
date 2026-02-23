import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IEmbeddingProvider,
  EMBEDDING_PROVIDER,
} from '@/core/interfaces/services/embedding-provider.interface';
import {
  IDocumentEmbeddingRepository,
  DOCUMENT_EMBEDDING_REPOSITORY,
} from '@/core/interfaces/repositories/document-embedding.repository.interface';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
} from '@/core/interfaces/services/observability.interface';
import { EmbedDocumentInput, EmbedDocumentResult } from '@/application/embedding/dto';
import { OPENAI_EMBEDDING } from '@/application/embedding/embedding.constants';

export const DOCUMENT_EMBEDDING_SERVICE = Symbol('DOCUMENT_EMBEDDING_SERVICE');

/**
 * Document Embedding Service.
 *
 * Orchestrates embedding operations for documents:
 * - Hash-based skip logic (don't re-embed unchanged content)
 * - Embedding generation via provider
 * - Storage in vector database
 * - Usage tracking
 */
@Injectable()
export class DocumentEmbeddingService {
  private readonly enabled: boolean;
  private readonly maxTokens: number;

  constructor(
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: IEmbeddingProvider,
    @Inject(DOCUMENT_EMBEDDING_REPOSITORY)
    private readonly embeddingRepository: IDocumentEmbeddingRepository,
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('embedding.enabled') ?? true;
    this.maxTokens =
      this.configService.get<number>('embedding.openai.maxTokens') ?? OPENAI_EMBEDDING.MAX_TOKENS;
  }

  /**
   * Embed a document.
   *
   * - Skips if embedding feature is disabled
   * - Skips if content hash matches existing embedding
   * - Creates or updates embedding
   * - Tracks usage
   */
  async embedDocument(input: EmbedDocumentInput): Promise<EmbedDocumentResult> {
    if (!this.enabled) {
      this.logger.debug('Embedding skipped: feature disabled', {
        documentId: input.documentId,
      });
      return {
        success: true,
        documentId: input.documentId,
        action: 'skipped',
      };
    }

    try {
      // Check if embedding already exists with same content hash
      const existing = await this.embeddingRepository.findByDocumentId(input.documentId);

      if (existing && existing.contentHash === input.contentHash) {
        this.logger.debug('Embedding skipped: content unchanged', {
          documentId: input.documentId,
          contentHash: input.contentHash,
        });
        return {
          success: true,
          documentId: input.documentId,
          action: 'skipped',
        };
      }

      // Prepare text for embedding (title + content)
      const textToEmbed = this.prepareTextForEmbedding(input.title, input.content);

      // Generate embedding
      const embeddingResult = await this.embeddingProvider.embed(textToEmbed);

      // Store embedding
      await this.embeddingRepository.upsert({
        documentId: input.documentId,
        projectId: input.projectId,
        vector: embeddingResult.vector,
        contentHash: input.contentHash,
        model: embeddingResult.model,
        inputTokens: embeddingResult.usage.totalTokens,
      });

      const action = existing ? 'updated' : 'created';

      this.logger.info(`Document embedding ${action}`, {
        documentId: input.documentId,
        projectId: input.projectId,
        model: embeddingResult.model,
        tokensUsed: embeddingResult.usage.totalTokens,
      });

      return {
        success: true,
        documentId: input.documentId,
        action,
        tokensUsed: embeddingResult.usage.totalTokens,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Document embedding failed', error as Error, {
        documentId: input.documentId,
        projectId: input.projectId,
      });

      return {
        success: false,
        documentId: input.documentId,
        action: 'failed',
        error: message,
      };
    }
  }

  /**
   * Embed a document (alias for embedDocument, kept for API compatibility).
   */
  async embedDocumentWithTracking(
    input: EmbedDocumentInput,
    _organizationId: string,
  ): Promise<EmbedDocumentResult> {
    return this.embedDocument(input);
  }

  /**
   * Check if document needs embedding.
   */
  async shouldEmbed(documentId: string, contentHash: string): Promise<boolean> {
    if (!this.enabled) {
      return false;
    }

    const existing = await this.embeddingRepository.findByDocumentId(documentId);

    if (!existing) {
      return true;
    }

    return existing.contentHash !== contentHash;
  }

  /**
   * Delete embedding for a document.
   */
  async deleteEmbedding(documentId: string): Promise<void> {
    await this.embeddingRepository.deleteByDocumentId(documentId);
  }

  /**
   * Check if embedding feature is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Prepare text for embedding.
   * Combines title and content, truncates if necessary.
   */
  private prepareTextForEmbedding(title: string, content: string): string {
    const combined = `${title}\n\n${content}`;
    const estimatedTokens = Math.ceil(combined.length / 4);

    if (estimatedTokens > this.maxTokens) {
      const maxChars = this.maxTokens * 4;
      this.logger.warn(
        `Document truncated for embedding: ${estimatedTokens} estimated tokens (max: ${this.maxTokens})`,
      );
      return combined.slice(0, maxChars);
    }

    return combined;
  }
}
