import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import {
  EMBEDDING_PROVIDER,
  EMBEDDING_PROVIDER_FACTORY,
} from '@/core/interfaces/services/embedding-provider.interface';
import { OpenAIEmbeddingProvider } from '@/infrastructure/embedding/providers/openai-embedding.provider';
import { StubEmbeddingProvider } from '@/infrastructure/embedding/providers/stub-embedding.provider';
import {
  EmbeddingProviderFactory,
  STUB_EMBEDDING_PROVIDER,
  OPENAI_EMBEDDING_PROVIDER,
} from '@/infrastructure/embedding/embedding-provider-factory';
import { embeddingConfig } from '@/infrastructure/config/embedding.config';

/**
 * Embedding Infrastructure Module.
 *
 * Provides embedding provider abstractions for semantic search.
 * Supports multiple providers with configuration-driven default selection.
 */
@Module({
  imports: [ConfigModule.forFeature(embeddingConfig)],
  providers: [
    // Stub provider (always available for testing)
    {
      provide: STUB_EMBEDDING_PROVIDER,
      useClass: StubEmbeddingProvider,
    },
    StubEmbeddingProvider,

    // OpenAI provider
    {
      provide: OPENAI_EMBEDDING_PROVIDER,
      useClass: OpenAIEmbeddingProvider,
    },
    OpenAIEmbeddingProvider,

    // Factory for provider management
    {
      provide: EMBEDDING_PROVIDER_FACTORY,
      useClass: EmbeddingProviderFactory,
    },
    EmbeddingProviderFactory,

    // Default EMBEDDING_PROVIDER token - resolves to configured default
    {
      provide: EMBEDDING_PROVIDER,
      useFactory: (factory: EmbeddingProviderFactory) => factory.getDefaultProvider(),
      inject: [EmbeddingProviderFactory],
    },
  ],
  exports: [
    EMBEDDING_PROVIDER,
    EMBEDDING_PROVIDER_FACTORY,
    STUB_EMBEDDING_PROVIDER,
    OPENAI_EMBEDDING_PROVIDER,
    StubEmbeddingProvider,
    OpenAIEmbeddingProvider,
    EmbeddingProviderFactory,
  ],
})
export class EmbeddingInfrastructureModule {}
