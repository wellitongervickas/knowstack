import { Document } from '@/core/entities/document.entity';
import { SearchMatchType } from '@/application/embedding/embedding.constants';

/**
 * Individual search result with scores.
 */
export interface SearchResult {
  documentId: string;
  document: Document;
  semanticScore: number | null;
  keywordScore: number | null;
  combinedScore: number;
  matchType: SearchMatchType;
}

/**
 * Hybrid search results with metadata.
 */
export interface HybridSearchResult {
  results: SearchResult[];
  fallbackUsed: boolean;
  fallbackReason?: string;
  embeddingTokensUsed: number;
}

/**
 * Internal score entry for ranking.
 */
export interface ScoreEntry {
  semanticScore: number;
  keywordScore: number;
  combinedScore: number;
  matchType: SearchMatchType;
}
