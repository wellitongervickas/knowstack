import { registerAs } from '@nestjs/config';
import {
  EMBEDDING_ENABLED,
  EMBEDDING_DEFAULT_PROVIDER,
  OPENAI_EMBEDDING_MODEL,
  EMBEDDING_TOP_K,
  EMBEDDING_HYBRID_WEIGHT,
  EMBEDDING_MIN_SCORE,
  EMBEDDING_SIMILARITY_FLOOR,
  EMBEDDING_RATE_LIMIT_PER_MINUTE,
  EMBEDDING_MAX_BATCH_SIZE,
  OPENAI_API_KEY,
} from '@/app.settings';
import { OPENAI_EMBEDDING } from '@/application/embedding/embedding.constants';

export interface EmbeddingConfig {
  enabled: boolean;
  defaultProvider: 'openai' | 'stub';
  topK: number;
  hybridWeight: number;
  minScore: number;
  similarityFloor: number;
  rateLimitPerMinute: number;
  maxBatchSize: number;
  openai: {
    apiKey: string | undefined;
    model: string;
    dimensions: number;
    maxTokens: number;
  };
}

export const embeddingConfig = registerAs(
  'embedding',
  (): EmbeddingConfig => ({
    enabled: EMBEDDING_ENABLED,
    defaultProvider: EMBEDDING_DEFAULT_PROVIDER as EmbeddingConfig['defaultProvider'],
    topK: EMBEDDING_TOP_K,
    hybridWeight: EMBEDDING_HYBRID_WEIGHT,
    minScore: EMBEDDING_MIN_SCORE,
    similarityFloor: EMBEDDING_SIMILARITY_FLOOR,
    rateLimitPerMinute: EMBEDDING_RATE_LIMIT_PER_MINUTE,
    maxBatchSize: EMBEDDING_MAX_BATCH_SIZE,
    openai: {
      apiKey: OPENAI_API_KEY || undefined,
      model: OPENAI_EMBEDDING_MODEL,
      dimensions: OPENAI_EMBEDDING.DIMENSIONS,
      maxTokens: OPENAI_EMBEDDING.MAX_TOKENS,
    },
  }),
);
