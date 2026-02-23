/**
 * AI Provider interfaces.
 * Defines the contract for AI completion providers (OpenAI, Anthropic, etc.)
 *
 * These interfaces ensure provider-agnostic design.
 * Infrastructure layer implements concrete providers.
 */

// ============= Message Types =============

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// ============= Request Types =============

export interface AICompletionRequest {
  messages: AIMessage[];
  maxTokens?: number;
  temperature?: number;
  stopSequences?: string[];
}

// ============= Response Types =============

export interface AICompletionResponse {
  id: string;
  content: string;
  model: string;
  usage: AIUsageMetrics;
  finishReason: AIFinishReason;
}

export interface AIUsageMetrics {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export type AIFinishReason = 'stop' | 'length' | 'content_filter' | 'error';

// ============= Streaming Types (SCAFFOLD) =============

export interface AIStreamChunk {
  id: string;
  delta: string;
  finishReason?: AIFinishReason;
}

// ============= Provider Interface =============

/**
 * AI Provider interface.
 * All AI providers (OpenAI, Anthropic, Stub) must implement this.
 */
export interface IAIProvider {
  /** Provider name (e.g., 'openai', 'anthropic', 'stub') */
  readonly name: string;

  /**
   * Generate a completion from messages.
   */
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;

  /**
   * Generate a streaming completion.
   * SCAFFOLD: Not implemented in MVP.
   */
  completeStream(request: AICompletionRequest): AsyncIterable<AIStreamChunk>;

  /**
   * Health check for the provider.
   */
  healthCheck(): Promise<boolean>;
}

// ============= Factory Interface =============

/**
 * AI Provider Factory interface.
 * Used to get providers by name or get the default provider.
 */
export interface IAIProviderFactory {
  /**
   * Get a provider by name.
   */
  getProvider(name: string): IAIProvider;

  /**
   * Get the default configured provider.
   */
  getDefaultProvider(): IAIProvider;

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

export const AI_PROVIDER = Symbol('AI_PROVIDER');
export const AI_PROVIDER_FACTORY = Symbol('AI_PROVIDER_FACTORY');
