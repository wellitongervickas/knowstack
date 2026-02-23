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
import { Instruction } from '@/core/entities/instruction.entity';
import {
  SEARCH_MATCH_TYPES,
  EMBEDDING_DEFAULTS,
  SearchMatchType,
} from '@/application/embedding/embedding.constants';
import { INSTRUCTION_SEARCH_WEIGHTS } from '@/application/instructions/instructions.constants';
import { scoreByKeywords } from '@/common/utils/keyword-scoring.util';

export const INSTRUCTION_SEARCH_SERVICE = Symbol('INSTRUCTION_SEARCH_SERVICE');

/**
 * Score entry for hybrid ranking of instructions.
 */
interface InstructionScoreEntry {
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
  matchType: SearchMatchType;
}

/**
 * Individual instruction search result with scores.
 */
export interface InstructionSearchResult {
  instruction: Instruction;
  semanticScore: number | null;
  keywordScore: number | null;
  combinedScore: number;
  matchType: SearchMatchType;
}

/**
 * Hybrid search results for instructions with metadata.
 */
export interface InstructionHybridSearchResult {
  results: InstructionSearchResult[];
  fallbackUsed: boolean;
  embeddingTokensUsed: number;
}

/**
 * Instruction Search Service.
 *
 * Implements hybrid search combining:
 * - Vector similarity search (semantic)
 * - Keyword search (name/description/content matching)
 *
 * Accepts pre-merged instructions (visibility merge already applied by caller).
 * Provides graceful fallback to keyword-only on errors.
 */
@Injectable()
export class InstructionSearchService {
  private readonly enabled: boolean;
  private readonly defaultTopK: number;
  private readonly defaultHybridWeight: number;
  private readonly minScore: number;
  private readonly similarityFloor: number;

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
    this.defaultTopK = this.configService.get<number>('embedding.topK') ?? EMBEDDING_DEFAULTS.TOP_K;
    this.defaultHybridWeight =
      this.configService.get<number>('embedding.hybridWeight') ?? EMBEDDING_DEFAULTS.HYBRID_WEIGHT;
    this.minScore =
      this.configService.get<number>('embedding.minScore') ?? EMBEDDING_DEFAULTS.MIN_SCORE;
    this.similarityFloor =
      this.configService.get<number>('embedding.similarityFloor') ??
      EMBEDDING_DEFAULTS.SIMILARITY_FLOOR;
  }

  /**
   * Perform hybrid search on a pre-merged set of instructions.
   *
   * @param candidates - Instructions to search (already visibility-merged)
   * @param query - User search query
   * @param options - Search options (topK, semanticWeight)
   */
  async search(
    candidates: Instruction[],
    query: string,
    options?: { topK?: number; semanticWeight?: number },
  ): Promise<InstructionHybridSearchResult> {
    const topK = options?.topK ?? this.defaultTopK;
    const semanticWeight = options?.semanticWeight ?? this.defaultHybridWeight;
    const keywordWeight = 1 - semanticWeight;
    let embeddingTokensUsed = 0;
    const fetchLimit = Math.min(topK * 2, 50);

    if (candidates.length === 0) {
      return { results: [], fallbackUsed: false, embeddingTokensUsed: 0 };
    }

    const candidateIds = candidates.map((i) => i.id);
    const candidateMap = new Map(candidates.map((i) => [i.id, i]));

    // 1. Semantic search (embed query + vector similarity)
    let semanticResults: { instructionId: string; similarity: number }[] = [];
    let semanticFailed = false;
    try {
      if (this.enabled) {
        const embedding = await this.embeddingProvider.embed(query);
        embeddingTokensUsed = embedding.usage.totalTokens;

        semanticResults = await this.embeddingRepository.findSimilar(
          candidateIds,
          embedding.vector,
          fetchLimit,
        );
      }
    } catch (error) {
      semanticFailed = true;
      this.logger.warn('Instruction semantic search failed, continuing with keyword-only', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // 2. Keyword search (in-memory, shared utility)
    const keywordResults = scoreByKeywords(candidates, query, INSTRUCTION_SEARCH_WEIGHTS);

    // 3. Merge and rank
    const scoreMap = new Map<string, InstructionScoreEntry>();

    for (const result of semanticResults) {
      const normalizedScore = Math.max(
        0,
        (result.similarity - this.similarityFloor) / (1 - this.similarityFloor),
      );
      scoreMap.set(result.instructionId, {
        semanticScore: normalizedScore,
        keywordScore: 0,
        combinedScore: 0,
        matchType: SEARCH_MATCH_TYPES.SEMANTIC as SearchMatchType,
      });
    }

    for (const result of keywordResults) {
      if (result.score <= 0) continue;
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

    // 5. Filter low-quality results.
    //    MIN_SCORE filters vector noise — apply only to semantic-only results (no keyword signal).
    //    Any result with keyword signal (keyword-only or hybrid) is kept: the term actually
    //    appears in the instruction, so it's relevant by definition. Only pure semantic results
    //    with low similarity are filtered as noise.
    const filtered = semanticFailed
      ? Array.from(scoreMap.entries())
      : Array.from(scoreMap.entries()).filter(
          ([, scores]) => scores.keywordScore > 0 || scores.semanticScore >= this.minScore,
        );
    const ranked = filtered.sort((a, b) => b[1].combinedScore - a[1].combinedScore).slice(0, topK);

    // 6. Build results
    const results: InstructionSearchResult[] = ranked
      .map(([id, scores]) => {
        const instruction = candidateMap.get(id);
        if (!instruction) return null;

        return {
          instruction,
          semanticScore: scores.semanticScore > 0 ? scores.semanticScore : null,
          keywordScore: scores.keywordScore > 0 ? scores.keywordScore : null,
          combinedScore: scores.combinedScore,
          matchType: scores.matchType,
        };
      })
      .filter((r): r is InstructionSearchResult => r !== null);

    this.logger.debug('Instruction hybrid search completed', {
      totalCandidates: candidates.length,
      totalResults: results.length,
      semanticMatches: results.filter((r) => r.matchType !== SEARCH_MATCH_TYPES.KEYWORD).length,
      keywordMatches: results.filter((r) => r.matchType !== SEARCH_MATCH_TYPES.SEMANTIC).length,
      embeddingTokensUsed,
    });

    return {
      results,
      fallbackUsed: semanticFailed,
      embeddingTokensUsed,
    };
  }

  /**
   * Check if semantic search is enabled.
   */
  isEnabled(): boolean {
    return this.enabled;
  }
}
