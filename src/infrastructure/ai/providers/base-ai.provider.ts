import {
  IAIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '@/core/interfaces/services/ai-provider.interface';

/**
 * SCAFFOLD: Base abstract class for AI providers.
 * Provides common functionality for concrete implementations.
 *
 * Will be implemented when adding real OpenAI/Anthropic support.
 */
export abstract class BaseAIProvider implements IAIProvider {
  abstract readonly name: string;

  abstract complete(request: AICompletionRequest): Promise<AICompletionResponse>;

  abstract completeStream(request: AICompletionRequest): AsyncIterable<AIStreamChunk>;

  abstract healthCheck(): Promise<boolean>;

  /**
   * Utility: Estimate token count from text.
   * Override in concrete implementations for provider-specific tokenization.
   */
  protected estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Utility: Validate completion request.
   */
  protected validateRequest(request: AICompletionRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('At least one message is required');
    }
  }
}
