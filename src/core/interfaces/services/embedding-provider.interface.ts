/**
 * Embedding Provider interfaces.
 * Defines the contract for embedding providers (OpenAI, etc.)
 *
 * These interfaces ensure provider-agnostic design.
 * Infrastructure layer implements concrete providers.
 */

// ============= Result Types =============

export interface EmbeddingResult {
  vector: number[];
  usage: { totalTokens: number };
  model: string;
}

// ============= Provider Interface =============

/**
 * Embedding Provider interface.
 * All embedding providers (OpenAI, Stub) must implement this.
 */
export interface IEmbeddingProvider {
  /** Provider name (e.g., 'openai', 'stub') */
  readonly name: string;

  /** Vector dimensions produced by this provider */
  readonly dimensions: number;

  /**
   * Generate an embedding vector for text.
   */
  embed(text: string): Promise<EmbeddingResult>;

  /**
   * SCAFFOLD: Batch embedding for future optimization.
   * Generate embedding vectors for multiple texts.
   */
  embedBatch(texts: string[]): Promise<EmbeddingResult[]>;

  /**
   * Health check for the provider.
   */
  healthCheck(): Promise<boolean>;
}

// ============= Factory Interface =============

/**
 * Embedding Provider Factory interface.
 * Used to get providers by name or get the default provider.
 */
export interface IEmbeddingProviderFactory {
  /**
   * Get a provider by name.
   */
  getProvider(name: string): IEmbeddingProvider;

  /**
   * Get the default configured provider.
   */
  getDefaultProvider(): IEmbeddingProvider;

  /**
   * List all available provider names.
   */
  listProviders(): string[];

  /**
   * Check if a provider is registered.
   */
  hasProvider(name: string): boolean;
}

// ============= Injection Tokens =============

export const EMBEDDING_PROVIDER = Symbol('EMBEDDING_PROVIDER');
export const EMBEDDING_PROVIDER_FACTORY = Symbol('EMBEDDING_PROVIDER_FACTORY');
