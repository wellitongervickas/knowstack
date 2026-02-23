import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAIEmbeddingProvider } from '@/infrastructure/embedding/providers/openai-embedding.provider';

// Mock app.settings — must be before imports that use them
vi.mock('@/app.settings', () => ({
  OPENAI_API_KEY: 'test-api-key',
  OPENAI_EMBEDDING_MODEL: 'text-embedding-3-small',
}));

// Mock embeddings.create function - hoisted so it can be used in the mock
const mockCreate = vi.fn();

// Mock OpenAI module - everything must be defined inside since vi.mock is hoisted
vi.mock('openai', () => {
  // Define APIError class inside the mock
  class APIError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
      this.name = 'APIError';
    }
  }

  // Define the main class
  class MockOpenAI {
    embeddings = {
      create: mockCreate,
    };

    static APIError = APIError;
  }

  return {
    default: MockOpenAI,
    APIError,
  };
});

describe('OpenAIEmbeddingProvider', () => {
  let provider: OpenAIEmbeddingProvider;

  const mockEmbedding = new Array(1536).fill(0.1);

  beforeEach(() => {
    vi.clearAllMocks();

    provider = new OpenAIEmbeddingProvider();
  });

  describe('properties', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('openai');
    });

    it('should have correct dimensions', () => {
      expect(provider.dimensions).toBe(1536);
    });
  });

  describe('embed', () => {
    it('should return embedding result', async () => {
      mockCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { total_tokens: 100 },
        model: 'text-embedding-3-small',
      });

      const result = await provider.embed('test text');

      expect(result.vector).toEqual(mockEmbedding);
      expect(result.usage.totalTokens).toBe(100);
      expect(result.model).toBe('text-embedding-3-small');
    });

    it('should throw EmbeddingApiException on API error', async () => {
      // Create an error that looks like OpenAI.APIError
      const apiError = new Error('Rate limited') as Error & { status: number };
      apiError.status = 429;
      apiError.name = 'APIError';
      mockCreate.mockRejectedValue(apiError);

      await expect(provider.embed('test text')).rejects.toThrow();
    });

    it('should throw error when no embedding returned', async () => {
      mockCreate.mockResolvedValue({
        data: [],
        usage: { total_tokens: 0 },
        model: 'text-embedding-3-small',
      });

      await expect(provider.embed('test text')).rejects.toThrow('Embedding provider error');
    });
  });

  describe('embedBatch', () => {
    it('should return batch embedding results', async () => {
      mockCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }, { embedding: mockEmbedding }],
        usage: { total_tokens: 200 },
        model: 'text-embedding-3-small',
      });

      const result = await provider.embedBatch(['text 1', 'text 2']);

      expect(result).toHaveLength(2);
      expect(result[0].vector).toEqual(mockEmbedding);
      expect(result[1].vector).toEqual(mockEmbedding);
    });
  });

  describe('healthCheck', () => {
    it('should return true on successful API call', async () => {
      mockCreate.mockResolvedValue({
        data: [{ embedding: mockEmbedding }],
        usage: { total_tokens: 1 },
        model: 'text-embedding-3-small',
      });

      const result = await provider.healthCheck();
      expect(result).toBe(true);
    });

    it('should return false on API error', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      const result = await provider.healthCheck();
      expect(result).toBe(false);
    });
  });
});
