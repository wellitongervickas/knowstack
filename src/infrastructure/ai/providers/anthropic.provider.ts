import { Injectable } from '@nestjs/common';
import {
  IAIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '@/core/interfaces/services/ai-provider.interface';
import { BaseAIProvider } from '@/infrastructure/ai/providers/base-ai.provider';

/**
 * SCAFFOLD: Anthropic Provider.
 * Will implement Claude and other Anthropic models.
 *
 * Not implemented in MVP - using StubAIProvider instead.
 */
@Injectable()
export class AnthropicProvider extends BaseAIProvider implements IAIProvider {
  readonly name = 'anthropic';

  async complete(_request: AICompletionRequest): Promise<AICompletionResponse> {
    // SCAFFOLD: Not implemented in MVP
    throw new Error('Anthropic provider not implemented. Use stub provider for MVP testing.');
  }

  // eslint-disable-next-line require-yield
  async *completeStream(_request: AICompletionRequest): AsyncIterable<AIStreamChunk> {
    // SCAFFOLD: Not implemented in MVP
    throw new Error('Anthropic streaming not implemented. Use stub provider for MVP testing.');
  }

  async healthCheck(): Promise<boolean> {
    // SCAFFOLD: Return false until implemented
    return false;
  }
}
