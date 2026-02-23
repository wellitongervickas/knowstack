import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AI_PROVIDER, AI_PROVIDER_FACTORY } from '@/core/interfaces/services/ai-provider.interface';
import { StubAIProvider } from '@/infrastructure/ai/providers/stub-ai.provider';
import { OpenAIProvider } from '@/infrastructure/ai/providers/openai.provider';
import {
  AIProviderFactory,
  STUB_AI_PROVIDER,
  OPENAI_PROVIDER,
} from '@/infrastructure/ai/ai-provider-factory';
import { aiConfig } from '@/infrastructure/config/ai.config';

/**
 * AI Module.
 *
 * Provides AI provider abstractions for the query pipeline.
 * Supports multiple providers with configuration-driven default selection.
 */
@Module({
  imports: [ConfigModule.forFeature(aiConfig)],
  providers: [
    // Stub provider (always available for testing)
    {
      provide: STUB_AI_PROVIDER,
      useClass: StubAIProvider,
    },
    StubAIProvider,

    // OpenAI provider
    {
      provide: OPENAI_PROVIDER,
      useClass: OpenAIProvider,
    },
    OpenAIProvider,

    // Factory for provider management
    {
      provide: AI_PROVIDER_FACTORY,
      useClass: AIProviderFactory,
    },
    AIProviderFactory,

    // Default AI_PROVIDER token - resolves to configured default
    {
      provide: AI_PROVIDER,
      useFactory: (factory: AIProviderFactory) => factory.getDefaultProvider(),
      inject: [AIProviderFactory],
    },
  ],
  exports: [
    AI_PROVIDER,
    AI_PROVIDER_FACTORY,
    STUB_AI_PROVIDER,
    OPENAI_PROVIDER,
    StubAIProvider,
    OpenAIProvider,
    AIProviderFactory,
  ],
})
export class AIModule {}
