import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import {
  IEmbeddingProvider,
  EmbeddingResult,
} from '@/core/interfaces/services/embedding-provider.interface';
import { EmbeddingApiException } from '@/core/exceptions/embedding.exception';
import { OPENAI_EMBEDDING } from '@/application/embedding/embedding.constants';
import { OPENAI_API_KEY, OPENAI_EMBEDDING_MODEL } from '@/app.settings';

/**
 * OpenAI Embedding Provider Implementation.
 *
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions).
 * Handles API calls, error normalization, and usage tracking.
 */
@Injectable()
export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'openai';
  readonly dimensions = OPENAI_EMBEDDING.DIMENSIONS;

  private readonly logger = new Logger(OpenAIEmbeddingProvider.name);
  private readonly client: OpenAI;
  private readonly model: string;
  private readonly apiKey: string;

  constructor() {
    this.apiKey = OPENAI_API_KEY;
    this.model = OPENAI_EMBEDDING_MODEL || OPENAI_EMBEDDING.MODEL;

    this.client = new OpenAI({
      apiKey: this.apiKey || '',
      maxRetries: 3,
      timeout: 30000,
    });
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const startTime = performance.now();

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });

      const latencyMs = performance.now() - startTime;
      this.logger.debug(`OpenAI embedding took ${latencyMs.toFixed(2)}ms`);

      const embedding = response.data[0];
      if (!embedding) {
        throw new Error('OpenAI returned no embedding');
      }

      return {
        vector: embedding.embedding,
        usage: {
          totalTokens: response.usage?.total_tokens ?? 0,
        },
        model: response.model,
      };
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      this.logger.error(
        `OpenAI embedding failed after ${latencyMs.toFixed(2)}ms`,
        error instanceof Error ? error.stack : String(error),
      );
      throw this.normalizeError(error);
    }
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const startTime = performance.now();

    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
      });

      const latencyMs = performance.now() - startTime;
      this.logger.debug(
        `OpenAI batch embedding (${texts.length} texts) took ${latencyMs.toFixed(2)}ms`,
      );

      const tokensPerItem = Math.ceil((response.usage?.total_tokens ?? 0) / texts.length);

      return response.data.map((item) => ({
        vector: item.embedding,
        usage: {
          totalTokens: tokensPerItem,
        },
        model: response.model,
      }));
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      this.logger.error(
        `OpenAI batch embedding failed after ${latencyMs.toFixed(2)}ms`,
        error instanceof Error ? error.stack : String(error),
      );
      throw this.normalizeError(error);
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.debug('OpenAI embedding health check skipped: no API key configured');
      return false;
    }

    try {
      await this.client.embeddings.create({
        model: this.model,
        input: 'ping',
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `OpenAI embedding health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  private normalizeError(error: unknown): EmbeddingApiException {
    if (error instanceof OpenAI.APIError) {
      this.logger.error(`OpenAI API error (${error.status}): ${error.message}`);
      return new EmbeddingApiException('Embedding provider error', error);
    }

    if (error instanceof Error) {
      this.logger.error(`Embedding error: ${error.message}`);
      return new EmbeddingApiException('Embedding provider error', error);
    }

    this.logger.error(`Unknown embedding error: ${String(error)}`);
    return new EmbeddingApiException('Embedding provider error');
  }
}
