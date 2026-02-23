import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  IEmbeddingProvider,
  EmbeddingResult,
} from '@/core/interfaces/services/embedding-provider.interface';
import { OPENAI_EMBEDDING } from '@/application/embedding/embedding.constants';

/**
 * Stub Embedding Provider for testing.
 * Returns deterministic fake embeddings without calling any external API.
 * Identical inputs always produce identical outputs.
 */
@Injectable()
export class StubEmbeddingProvider implements IEmbeddingProvider {
  readonly name = 'stub';
  readonly dimensions = OPENAI_EMBEDDING.DIMENSIONS;

  async embed(text: string): Promise<EmbeddingResult> {
    return {
      vector: this.createDeterministicVector(text),
      usage: {
        totalTokens: this.estimateTokens(text),
      },
      model: 'stub-embedding-v1',
    };
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    return texts.map((text) => ({
      vector: this.createDeterministicVector(text),
      usage: {
        totalTokens: this.estimateTokens(text),
      },
      model: 'stub-embedding-v1',
    }));
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  /**
   * Create a deterministic embedding vector from text.
   * Uses hash to ensure same text always produces same vector.
   */
  private createDeterministicVector(text: string): number[] {
    const hash = createHash('sha256').update(text).digest();
    const vector: number[] = [];

    for (let i = 0; i < this.dimensions; i++) {
      const byteIndex = i % hash.length;
      const value = ((hash[byteIndex] / 255) * 2 - 1) * 0.1;
      vector.push(value + Math.sin(i * 0.1) * 0.01);
    }

    return this.normalizeVector(vector);
  }

  /**
   * Normalize vector to unit length (for cosine similarity).
   */
  private normalizeVector(vector: number[]): number[] {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map((val) => val / magnitude);
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}
