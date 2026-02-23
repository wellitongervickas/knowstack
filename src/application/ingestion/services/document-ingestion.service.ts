import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  IDocumentRepository,
  DOCUMENT_REPOSITORY,
} from '@/core/interfaces/repositories/document.repository.interface';
import { ISourceFetcher, URL_FETCHER } from '@/core/interfaces/services/source-fetcher.interface';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
} from '@/core/interfaces/services/observability.interface';
import {
  IAuditLogService,
  AUDIT_LOG_SERVICE,
} from '@/core/interfaces/services/audit-log.interface';
import { computeContentHash } from '@/common/utils/crypto.util';
import { DocumentNotFoundException } from '@/core/exceptions/document.exception';
import {
  IngestDocumentInput,
  IngestFromSourceInput,
  IngestResult,
} from '@/application/ingestion/dto/ingest-document.dto';
import {
  CacheInvalidationService,
  CACHE_INVALIDATION_SERVICE,
} from '@/application/cache/services/cache-invalidation.service';
import {
  DocumentEmbeddingService,
  DOCUMENT_EMBEDDING_SERVICE,
} from '@/application/embedding/services/document-embedding.service';
import { AuditAction, AuditCategory, ResourceType } from '@/application/audit/audit.constants';
import { SOURCE_TYPES } from '@/application/ingestion/ingestion.constants';

export const DOCUMENT_INGESTION_SERVICE = Symbol('DOCUMENT_INGESTION_SERVICE');

/**
 * Service for ingesting documents from various sources.
 * Handles content normalization, hashing, and deduplication.
 * Triggers embedding generation on document create/update.
 */
@Injectable()
export class DocumentIngestionService {
  private readonly fetchers: Map<string, ISourceFetcher>;

  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
    @Inject(URL_FETCHER)
    private readonly urlFetcher: ISourceFetcher,
    @Inject(CACHE_INVALIDATION_SERVICE)
    private readonly cacheInvalidation: CacheInvalidationService,
    @Optional()
    @Inject(DOCUMENT_EMBEDDING_SERVICE)
    private readonly embeddingService?: DocumentEmbeddingService,
    @Optional()
    @Inject(AUDIT_LOG_SERVICE)
    private readonly auditLogService?: IAuditLogService,
  ) {
    this.fetchers = new Map([[SOURCE_TYPES.URL, this.urlFetcher]]);
  }

  /**
   * Ingest a document with deduplication.
   * - Computes content hash
   * - Checks for existing document with same hash (skip if unchanged)
   * - Checks for existing document with same sourceUrl (update if changed)
   * - Creates new document if neither exists
   */
  async ingest(input: IngestDocumentInput): Promise<IngestResult> {
    const startTime = Date.now();

    try {
      // Compute hash (normalizes content internally)
      const contentHash = computeContentHash(input.content);

      // Check for existing document by content hash (deduplication)
      const existingByHash = await this.documentRepository.findByContentHash(
        input.projectId,
        contentHash,
      );

      if (existingByHash) {
        this.logIngestion('unchanged', input, startTime);
        return {
          success: true,
          documentId: existingByHash.id,
          action: 'unchanged',
        };
      }

      // Check for existing document by source URL (update detection)
      let existingByUrl = null;
      if (input.sourceUrl) {
        existingByUrl = await this.documentRepository.findBySourceUrl(
          input.projectId,
          input.sourceUrl,
        );
      }

      if (existingByUrl) {
        // Content changed - update existing document
        const updated = await this.documentRepository.update(existingByUrl.id, {
          title: input.title,
          content: input.content,
          contentHash,
          metadata: {
            ...existingByUrl.metadata,
            ...input.metadata,
          },
        });

        // Invalidate cache (fire-and-forget)
        this.invalidateCache(input.projectId);

        // Trigger embedding (fire-and-forget)
        this.triggerEmbedding(
          updated.id,
          input.projectId,
          input.title,
          input.content,
          contentHash,
          input.organizationId,
        );

        // Log audit event (fire-and-forget)
        this.auditLogService?.log({
          action: AuditAction.DOCUMENT_UPDATED,
          category: AuditCategory.DOCUMENT,
          resourceType: ResourceType.DOCUMENT,
          resourceId: updated.id,
          organizationId: input.organizationId,
          projectId: input.projectId,
          metadata: {
            title: input.title,
            fieldsChanged: ['title', 'content', 'contentHash', 'metadata'],
          },
        });

        this.logIngestion('updated', input, startTime);
        return {
          success: true,
          documentId: updated.id,
          action: 'updated',
        };
      }

      // Create new document
      const created = await this.documentRepository.create({
        projectId: input.projectId,
        title: input.title,
        content: input.content,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl,
        contentHash,
        metadata: input.metadata,
      });

      // Invalidate cache (fire-and-forget)
      this.invalidateCache(input.projectId);

      // Trigger embedding (fire-and-forget)
      this.triggerEmbedding(
        created.id,
        input.projectId,
        input.title,
        input.content,
        contentHash,
        input.organizationId,
      );

      // Log audit event (fire-and-forget)
      this.auditLogService?.log({
        action: AuditAction.DOCUMENT_CREATED,
        category: AuditCategory.DOCUMENT,
        resourceType: ResourceType.DOCUMENT,
        resourceId: created.id,
        organizationId: input.organizationId,
        projectId: input.projectId,
        metadata: {
          title: input.title,
          contentType: input.sourceType,
        },
      });

      this.logIngestion('created', input, startTime);
      return {
        success: true,
        documentId: created.id,
        action: 'created',
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Ingestion failed', error as Error, {
        projectId: input.projectId,
        sourceType: input.sourceType,
        sourceUrl: input.sourceUrl,
      });

      return {
        success: false,
        action: 'failed',
        error: message,
      };
    }
  }

  /**
   * Fetch and ingest from an external source.
   */
  async ingestFromSource(input: IngestFromSourceInput): Promise<IngestResult> {
    const fetcher = this.fetchers.get(input.sourceType);
    if (!fetcher) {
      return {
        success: false,
        action: 'failed',
        error: `Unknown source type: ${input.sourceType}`,
      };
    }

    const fetchResult = await fetcher.fetch(input.sourceUrl);

    if (!fetchResult.success || !fetchResult.document) {
      return {
        success: false,
        action: 'failed',
        error: fetchResult.error ?? 'Fetch failed',
      };
    }

    return this.ingest({
      projectId: input.projectId,
      title: input.title ?? fetchResult.document.title,
      content: fetchResult.document.content,
      sourceType: input.sourceType,
      sourceUrl: fetchResult.document.sourceUrl,
      metadata: fetchResult.document.metadata,
      organizationId: input.organizationId,
    });
  }

  /**
   * Batch ingest multiple documents.
   * Continues on individual failures - returns all results.
   */
  async ingestBatch(inputs: IngestDocumentInput[]): Promise<IngestResult[]> {
    const results: IngestResult[] = [];

    for (const input of inputs) {
      const result = await this.ingest(input);
      results.push(result);
    }

    return results;
  }

  /**
   * Delete a document by ID.
   * Invalidates cache and logs audit event.
   */
  async delete(documentId: string, projectId: string, organizationId?: string): Promise<void> {
    // Fetch document for audit metadata and tenant validation
    const document = await this.documentRepository.findById(documentId);

    // Tenant isolation: 404 for not found OR cross-project access
    if (!document || document.projectId !== projectId) {
      throw new DocumentNotFoundException(documentId);
    }

    // Delete the document
    await this.documentRepository.delete(documentId);

    // Invalidate cache (fire-and-forget)
    this.invalidateCache(projectId);

    // Log audit event (fire-and-forget)
    this.auditLogService?.log({
      action: AuditAction.DOCUMENT_DELETED,
      category: AuditCategory.DOCUMENT,
      resourceType: ResourceType.DOCUMENT,
      resourceId: documentId,
      organizationId,
      projectId,
      metadata: {
        title: document.title,
      },
    });
  }

  /**
   * Log ingestion event with metrics.
   */
  private logIngestion(
    action: 'created' | 'updated' | 'unchanged',
    input: IngestDocumentInput,
    startTime: number,
  ): void {
    const latencyMs = Date.now() - startTime;

    this.logger.info(`Document ingestion: ${action}`, {
      projectId: input.projectId,
      sourceType: input.sourceType,
      sourceUrl: input.sourceUrl,
      latencyMs,
    });
  }

  /**
   * Invalidate project cache after document changes.
   * Fire-and-forget - does not block the response.
   */
  private invalidateCache(projectId: string): void {
    this.cacheInvalidation.invalidateProjectCache(projectId).catch((err) => {
      this.logger.warn(
        `Cache invalidation failed for project ${projectId}: ${err instanceof Error ? err.message : err}`,
      );
    });
  }

  /**
   * Trigger embedding generation for a document.
   * Fire-and-forget - does not block the response.
   */
  private triggerEmbedding(
    documentId: string,
    projectId: string,
    title: string,
    content: string,
    contentHash: string,
    organizationId?: string,
  ): void {
    if (!this.embeddingService || !this.embeddingService.isEnabled()) {
      return;
    }

    const embedPromise = organizationId
      ? this.embeddingService.embedDocumentWithTracking(
          { documentId, projectId, title, content, contentHash },
          organizationId,
        )
      : this.embeddingService.embedDocument({ documentId, projectId, title, content, contentHash });

    embedPromise.catch((err) => {
      this.logger.warn(
        `Embedding failed for document ${documentId}: ${err instanceof Error ? err.message : err}`,
      );
    });
  }
}
