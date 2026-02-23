import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import {
  IEmbeddingProvider,
  IEmbeddingProviderFactory,
} from '@/core/interfaces/services/embedding-provider.interface';
import { OpenAIEmbeddingProvider } from '@/infrastructure/embedding/providers/openai-embedding.provider';
import { StubEmbeddingProvider } from '@/infrastructure/embedding/providers/stub-embedding.provider';
import { EMBEDDING_DEFAULT_PROVIDER, OPENAI_API_KEY } from '@/app.settings';
import { DEFAULT_PROVIDER_NAME } from '@/application/embedding/embedding.constants';

// Injection tokens for multiple providers
export const STUB_EMBEDDING_PROVIDER = Symbol('STUB_EMBEDDING_PROVIDER');
export const OPENAI_EMBEDDING_PROVIDER = Symbol('OPENAI_EMBEDDING_PROVIDER');

/**
 * Embedding Provider Factory.
 *
 * Registers available providers and selects default based on configuration.
 * Validates configuration at startup and fails fast if misconfigured.
 */
@Injectable()
export class EmbeddingProviderFactory implements IEmbeddingProviderFactory, OnModuleInit {
  private readonly logger = new Logger(EmbeddingProviderFactory.name);
  private readonly providers: Map<string, IEmbeddingProvider> = new Map();
  private readonly defaultProviderName: string;

  constructor(
    @Inject(STUB_EMBEDDING_PROVIDER)
    private readonly stubProvider: StubEmbeddingProvider,
    @Inject(OPENAI_EMBEDDING_PROVIDER)
    private readonly openaiProvider: OpenAIEmbeddingProvider,
  ) {
    this.providers.set(this.stubProvider.name, this.stubProvider);
    this.providers.set(this.openaiProvider.name, this.openaiProvider);

    this.defaultProviderName = EMBEDDING_DEFAULT_PROVIDER || DEFAULT_PROVIDER_NAME;
  }

  onModuleInit(): void {
    this.logger.log(`Available embedding providers: ${this.listProviders().join(', ')}`);
    this.logger.log(`Default embedding provider: ${this.defaultProviderName}`);

    if (!this.hasProvider(this.defaultProviderName)) {
      throw new Error(
        `Default embedding provider '${this.defaultProviderName}' not found. ` +
          `Available: ${this.listProviders().join(', ')}`,
      );
    }

    if (this.defaultProviderName === 'openai') {
      if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is required when EMBEDDING_DEFAULT_PROVIDER=openai');
      }
    }
  }

  getProvider(name: string): IEmbeddingProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(
        `Embedding provider '${name}' not found. Available: ${this.listProviders().join(', ')}`,
      );
    }
    return provider;
  }

  getDefaultProvider(): IEmbeddingProvider {
    return this.getProvider(this.defaultProviderName);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }
}
