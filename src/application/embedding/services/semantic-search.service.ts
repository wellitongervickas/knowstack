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
  IDocumentRepository,
  DOCUMENT_REPOSITORY,
} from '@/core/interfaces/repositories/document.repository.interface';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
} from '@/core/interfaces/services/observability.interface';
import { HybridSearchResult, ScoreEntry, SearchResult } from '@/application/embedding/dto';
import {
  SEARCH_MATCH_TYPES,
  EMBEDDING_DEFAULTS,
  SearchMatchType,
} from '@/application/embedding/embedding.constants';

export const SEMANTIC_SEARCH_SERVICE = Symbol('SEMANTIC_SEARCH_SERVICE');

/**
 * Semantic Search Service.
 *
 * Implements hybrid search combining:
 * - Vector similarity search (semantic)
 * - Keyword search (title/content matching)
 *
 * Provides graceful fallback to keyword-only or all-docs on errors.
 */
@Injectable()
export class SemanticSearchService {
  private readonly enabled: boolean;
  private readonly defaultTopK: number;
  private readonly defaultHybridWeight: number;
  private readonly similarityFloor: number;

  constructor(
    @Inject(EMBEDDING_PROVIDER)
    private readonly embeddingProvider: IEmbeddingProvider,
    @Inject(DOCUMENT_EMBEDDING_REPOSITORY)
    private readonly embeddingRepository: IDocumentEmbeddingRepository,
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
    private readonly configService: ConfigService,
  ) {
    this.enabled = this.configService.get<boolean>('embedding.enabled') ?? true;
    this.defaultTopK = this.configService.get<number>('embedding.topK') ?? EMBEDDING_DEFAULTS.TOP_K;
    this.defaultHybridWeight =
      this.configService.get<number>('embedding.hybridWeight') ?? EMBEDDING_DEFAULTS.HYBRID_WEIGHT;
    this.similarityFloor =
      this.configService.get<number>('embedding.similarityFloor') ??
      EMBEDDING_DEFAULTS.SIMILARITY_FLOOR;
  }

  /**
   * Perform hybrid search combining semantic and keyword search.
   *
   * @param projectId - Project to search within (tenant isolation)
   * @param query - User query
   * @param topK - Number of results to return
   * @param semanticWeight - Weight for semantic results (0-1)
   */
  async search(
    projectId: string,
    query: string,
    topK: number = this.defaultTopK,
    semanticWeight: number = this.defaultHybridWeight,
  ): Promise<HybridSearchResult> {
    const keywordWeight = 1 - semanticWeight;
    let embeddingTokensUsed = 0;
    const fetchLimit = Math.min(topK * 2, 50);

    // 1. Semantic search (embed query + vector similarity)
    let semanticResults: { documentId: string; similarity: number }[] = [];
    try {
      if (this.enabled) {
        const embedding = await this.embeddingProvider.embed(query);
        embeddingTokensUsed = embedding.usage.totalTokens;

        semanticResults = await this.embeddingRepository.findSimilar(
          projectId,
          embedding.vector,
          fetchLimit,
        );
      }
    } catch (error) {
      this.logger.warn('Semantic search failed, continuing with keyword-only', {
        projectId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 2. Keyword search
    const keywordResults = await this.documentRepository.search(projectId, query, fetchLimit);

    // 3. Merge and rank
    const scoreMap = new Map<string, ScoreEntry>();

    for (const result of semanticResults) {
      const normalizedScore = Math.max(
        0,
        (result.similarity - this.similarityFloor) / (1 - this.similarityFloor),
      );
      scoreMap.set(result.documentId, {
        semanticScore: normalizedScore,
        keywordScore: 0,
        combinedScore: 0,
        matchType: SEARCH_MATCH_TYPES.SEMANTIC as SearchMatchType,
      });
    }

    for (const result of keywordResults) {
      const existing = scoreMap.get(result.id);
      if (existing) {
        existing.keywordScore = result.score;
        existing.matchType = SEARCH_MATCH_TYPES.HYBRID as SearchMatchType;
      } else {
        scoreMap.set(result.id, {
          semanticScore: 0,
          keywordScore: result.score,
          combinedScore: 0,
          matchType: SEARCH_MATCH_TYPES.KEYWORD as SearchMatchType,
        });
      }
    }

    // 4. Calculate combined scores
    for (const entry of scoreMap.values()) {
      entry.combinedScore =
        entry.semanticScore * semanticWeight + entry.keywordScore * keywordWeight;
    }

    // 5. Sort and take top-K
    const ranked = Array.from(scoreMap.entries())
      .sort((a, b) => b[1].combinedScore - a[1].combinedScore)
      .slice(0, topK);

    // 6. Fetch documents
    const documentIds = ranked.map(([id]) => id);
    const documents = await this.documentRepository.findByIds(documentIds);

    // Build results with document lookup
    const results: SearchResult[] = ranked
      .map(([id, scores]) => {
        const document = documents.find((d) => d.id === id);
        if (!document) return null;

        return {
          documentId: id,
          document,
          semanticScore: scores.semanticScore > 0 ? scores.semanticScore : null,
          keywordScore: scores.keywordScore > 0 ? scores.keywordScore : null,
          combinedScore: scores.combinedScore,
          matchType: scores.matchType,
        };
      })
      .filter((r): r is SearchResult => r !== null);

    this.logger.debug('Hybrid search completed', {
      projectId,
      totalResults: results.length,
      semanticMatches: results.filter((r) => r.matchType !== SEARCH_MATCH_TYPES.KEYWORD).length,
      keywordMatches: results.filter((r) => r.matchType !== SEARCH_MATCH_TYPES.SEMANTIC).length,
      embeddingTokensUsed,
    });

    return {
      results,
      fallbackUsed: false,
      embeddingTokensUsed,
    };
  }

  /**
   * Check if semantic search is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Check if pgvector is available.
   */
  async isPgvectorAvailable(): Promise<boolean> {
    return this.embeddingRepository.isPgvectorAvailable();
  }
}
