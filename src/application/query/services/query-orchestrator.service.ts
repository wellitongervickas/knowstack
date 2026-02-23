import { Injectable, Inject, HttpException, HttpStatus, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClsService } from 'nestjs-cls';
import { TenantContext } from '@/common/types/tenant-context.type';
import { Document } from '@/core/entities/document.entity';
import { IAIProvider, AI_PROVIDER } from '@/core/interfaces/services/ai-provider.interface';
import { ICacheService, CACHE_SERVICE } from '@/core/interfaces/services/cache.interface';
import {
  IMetricsService,
  METRICS_SERVICE,
} from '@/core/interfaces/services/observability.interface';
import { DocumentAccessService } from '@/application/documents/services/document-access.service';
import { ContextBuilderService } from '@/application/query/services/context-builder.service';
import { ResponseFormatterService } from '@/application/query/services/response-formatter.service';
import { QueryRequestDto } from '@/application/query/dto/query-request.dto';
import { QueryResponseDto, CachedQueryResponse } from '@/application/query/dto/query-response.dto';
import { generateQueryCacheKey } from '@/common/utils/cache-key.util';
import { RETRIEVAL_META_CLS_KEY } from '@/application/embedding/embedding.constants';
import {
  SemanticSearchService,
  SEMANTIC_SEARCH_SERVICE,
} from '@/application/embedding/services/semantic-search.service';
import { RETRIEVAL_METHODS } from '@/application/embedding/embedding.constants';
import { RetrievalMetadata } from '@/application/query/dto/retrieval-metadata.dto';

/**
 * This service owns the /query pipeline.
 * It must remain provider-agnostic and transport-agnostic.
 */
@Injectable()
export class QueryOrchestratorService {
  private readonly logger = new Logger(QueryOrchestratorService.name);
  private readonly maxResponseTokens: number;
  private readonly embeddingEnabled: boolean;
  private readonly embeddingTopK: number;

  constructor(
    private readonly documentAccessService: DocumentAccessService,
    private readonly contextBuilder: ContextBuilderService,
    private readonly responseFormatter: ResponseFormatterService,
    private readonly configService: ConfigService,
    private readonly cls: ClsService,
    @Inject(AI_PROVIDER)
    private readonly aiProvider: IAIProvider,
    @Inject(CACHE_SERVICE)
    private readonly cacheService: ICacheService,
    @Inject(METRICS_SERVICE)
    private readonly metricsService: IMetricsService,
    @Optional()
    @Inject(SEMANTIC_SEARCH_SERVICE)
    private readonly semanticSearchService?: SemanticSearchService,
  ) {
    this.maxResponseTokens = this.configService.get<number>('ai.maxResponseTokens') ?? 4096;
    this.embeddingEnabled = this.configService.get<boolean>('embedding.enabled') ?? true;
    this.embeddingTopK = this.configService.get<number>('embedding.topK') ?? 10;
  }

  /**
   * Execute a query against the documentation.
   *
   * Pipeline (cache-first):
   * 1. Generate cache key from query + context (no doc dependency)
   * 2. Check cache — on hit, return immediately (~5ms)
   * 3. On cache miss: retrieve documents, build context, call AI
   * 4. Cache result with retrievalMeta for future hits
   * 5. Format and return response
   */
  async execute(request: QueryRequestDto, tenant: TenantContext): Promise<QueryResponseDto> {
    const startTime = Date.now();

    const projectId = tenant.project.id;

    try {
      // 1. Generate cache key (no document dependency — invalidation handles freshness)
      const cacheKey = generateQueryCacheKey(projectId, request.query, request.context);

      // 2. Check cache before document retrieval
      const cachedResponse = await this.cacheService.get<CachedQueryResponse>(cacheKey);

      if (cachedResponse) {
        const latencyMs = Date.now() - startTime;
        this.metricsService.incrementCacheHits({ projectId });
        this.logger.debug(`Cache hit for project ${projectId}`);

        // Restore retrieval metadata from cached response for header injection
        if (cachedResponse.retrievalMeta) {
          this.storeRetrievalMeta(cachedResponse.retrievalMeta as RetrievalMetadata);
        }

        return this.formatCachedResponse(cachedResponse, latencyMs);
      }

      // 3. Cache miss — retrieve documents
      this.metricsService.incrementCacheMisses({ projectId });
      const { documents, retrievalMeta } = await this.retrieveDocuments(
        projectId,
        request.query,
        tenant,
      );

      // 4. Build AI messages from query, documents, and optional context
      const messages = this.contextBuilder.buildMessages(request.query, documents, request.context);

      // 5. Call AI provider
      const aiResponse = await this.aiProvider.complete({
        messages,
        maxTokens: this.maxResponseTokens,
        temperature: 0.7,
      });

      // 6. Format response
      const latencyMs = Date.now() - startTime;
      const response = this.responseFormatter.format(
        aiResponse,
        documents,
        latencyMs,
        this.aiProvider.name,
        false, // cacheHit = false
      );

      // 7. Cache the response with retrievalMeta (fire-and-forget)
      const responseToCache: CachedQueryResponse = {
        answer: response.answer,
        sources: response.sources,
        usage: response.usage,
        meta: {
          provider: response.meta.provider,
          model: response.meta.model,
        },
        retrievalMeta: {
          method: retrievalMeta.method,
          fallbackUsed: retrievalMeta.fallbackUsed,
          fallbackReason: retrievalMeta.fallbackReason,
          documentsRetrieved: retrievalMeta.documentsRetrieved,
          semanticMatches: retrievalMeta.semanticMatches,
          keywordMatches: retrievalMeta.keywordMatches,
          embeddingTokensUsed: retrievalMeta.embeddingTokensUsed,
        },
      };
      this.cacheService.set(cacheKey, responseToCache).catch((err) => {
        this.logger.warn(`Failed to cache response: ${err instanceof Error ? err.message : err}`);
      });

      // Store retrieval metadata for response headers
      this.storeRetrievalMeta(retrievalMeta);

      return response;
    } catch (error) {
      // Re-throw HTTP exceptions as-is (e.g., ForbiddenException)
      if (error instanceof HttpException) {
        throw error;
      }

      // Normalize unexpected errors
      this.logger.error(
        `Query execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : undefined,
      );

      throw new HttpException(
        {
          code: 'QUERY_EXECUTION_FAILED',
          message: 'Failed to execute query. Please try again.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Format a cached response into QueryResponseDto.
   * Uses cached sources directly — invalidation ensures freshness.
   */
  private formatCachedResponse(cached: CachedQueryResponse, latencyMs: number): QueryResponseDto {
    return this.responseFormatter.formatCached(
      {
        answer: cached.answer,
        sources: cached.sources,
        usage: cached.usage,
        meta: {
          provider: cached.meta.provider,
          model: cached.meta.model,
          latencyMs,
          cacheHit: true,
        },
      },
      latencyMs,
    );
  }

  /**
   * Store retrieval metadata in CLS for header injection.
   */
  private storeRetrievalMeta(retrievalMeta: RetrievalMetadata): void {
    this.cls.set(RETRIEVAL_META_CLS_KEY, retrievalMeta);
  }

  /**
   * Retrieve documents using semantic search or fallback to all-docs.
   */
  private async retrieveDocuments(
    projectId: string,
    query: string,
    tenant: TenantContext,
  ): Promise<{ documents: Document[]; retrievalMeta: RetrievalMetadata }> {
    // Use semantic search if enabled and service available
    if (this.embeddingEnabled && this.semanticSearchService?.isEnabled()) {
      try {
        const searchResult = await this.semanticSearchService.search(
          projectId,
          query,
          this.embeddingTopK,
        );

        const documents = searchResult.results.map((r) => r.document);
        const retrievalMeta: RetrievalMetadata = {
          method: RETRIEVAL_METHODS.HYBRID,
          fallbackUsed: searchResult.fallbackUsed,
          fallbackReason: searchResult.fallbackReason,
          documentsRetrieved: documents.length,
          semanticMatches: searchResult.results.filter((r) => r.matchType !== 'keyword').length,
          keywordMatches: searchResult.results.filter((r) => r.matchType !== 'semantic').length,
          embeddingTokensUsed: searchResult.embeddingTokensUsed,
        };

        return { documents, retrievalMeta };
      } catch (error) {
        // Graceful fallback to all-docs on any error
        this.logger.warn('Semantic search failed, falling back to all-docs', {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        });

        const contextProjectIds = this.getDocumentContextProjectIds(tenant);
        const documents = await this.documentAccessService.getDocumentsForProject(
          projectId,
          contextProjectIds,
        );
        return {
          documents,
          retrievalMeta: {
            method: RETRIEVAL_METHODS.ALL_DOCS,
            fallbackUsed: true,
            fallbackReason: error instanceof Error ? error.message : 'Search exception',
            documentsRetrieved: documents.length,
          },
        };
      }
    }

    // Embeddings disabled - use all docs
    const contextProjectIds = this.getDocumentContextProjectIds(tenant);
    const documents = await this.documentAccessService.getDocumentsForProject(
      projectId,
      contextProjectIds,
    );
    return {
      documents,
      retrievalMeta: {
        method: RETRIEVAL_METHODS.ALL_DOCS,
        fallbackUsed: false,
        documentsRetrieved: documents.length,
      },
    };
  }

  /**
   * Extract document-enabled context project IDs from tenant context.
   */
  private getDocumentContextProjectIds(tenant: TenantContext): string[] {
    return (tenant.contextProjects ?? [])
      .filter((cp) => {
        const docs = cp.config.documents;
        return docs === true || (typeof docs === 'object' && docs !== null);
      })
      .map((cp) => cp.id);
  }
}
