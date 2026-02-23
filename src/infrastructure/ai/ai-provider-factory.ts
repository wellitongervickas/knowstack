import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IAIProvider, IAIProviderFactory } from '@/core/interfaces/services/ai-provider.interface';
import { StubAIProvider } from '@/infrastructure/ai/providers/stub-ai.provider';
import { OpenAIProvider } from '@/infrastructure/ai/providers/openai.provider';

// Injection tokens for multiple providers
export const STUB_AI_PROVIDER = Symbol('STUB_AI_PROVIDER');
export const OPENAI_PROVIDER = Symbol('OPENAI_PROVIDER');

/**
 * AI Provider Factory.
 *
 * Registers available providers and selects default based on configuration.
 * Validates configuration at startup and fails fast if misconfigured.
 */
@Injectable()
export class AIProviderFactory implements IAIProviderFactory, OnModuleInit {
  private readonly logger = new Logger(AIProviderFactory.name);
  private readonly providers: Map<string, IAIProvider> = new Map();
  private readonly defaultProviderName: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(STUB_AI_PROVIDER)
    private readonly stubProvider: StubAIProvider,
    @Inject(OPENAI_PROVIDER)
    private readonly openaiProvider: OpenAIProvider,
  ) {
    // Register all available providers
    this.providers.set(this.stubProvider.name, this.stubProvider);
    this.providers.set(this.openaiProvider.name, this.openaiProvider);

    // Determine default provider from config
    this.defaultProviderName = this.configService.get<string>('ai.defaultProvider') || 'stub';
  }

  /**
   * Validate configuration on module initialization.
   * Fails fast if OpenAI is selected but not configured.
   */
  onModuleInit(): void {
    this.logger.log(`Available AI providers: ${this.listProviders().join(', ')}`);
    this.logger.log(`Default AI provider: ${this.defaultProviderName}`);

    // Validate that default provider exists
    if (!this.hasProvider(this.defaultProviderName)) {
      throw new Error(
        `Default AI provider '${this.defaultProviderName}' not found. ` +
          `Available: ${this.listProviders().join(', ')}`,
      );
    }

    // Validate OpenAI configuration if it's the default
    if (this.defaultProviderName === 'openai') {
      const apiKey = this.configService.get<string>('ai.openai.apiKey');
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required when AI_DEFAULT_PROVIDER=openai');
      }
    }
  }

  getProvider(name: string): IAIProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(
        `AI provider '${name}' not found. Available: ${this.listProviders().join(', ')}`,
      );
    }
    return provider;
  }

  getDefaultProvider(): IAIProvider {
    return this.getProvider(this.defaultProviderName);
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  hasProvider(name: string): boolean {
    return this.providers.has(name);
  }
}
