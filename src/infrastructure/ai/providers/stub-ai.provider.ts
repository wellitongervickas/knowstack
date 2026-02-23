import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import {
  IAIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
} from '@/core/interfaces/services/ai-provider.interface';

/**
 * Stub AI Provider for MVP testing.
 * Returns deterministic fake responses without calling any external API.
 * Identical inputs always produce identical outputs.
 */
@Injectable()
export class StubAIProvider implements IAIProvider {
  readonly name = 'stub';

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const userMessage = request.messages.find((m) => m.role === 'user');
    const query = userMessage?.content || 'No query provided';

    // Simulate token usage based on input/output length
    const promptTokens = this.estimateTokens(request.messages.map((m) => m.content).join(' '));
    const completionTokens = 50;

    // Deterministic ID: hash of all message contents
    const id = this.generateDeterministicId(request);

    return {
      id,
      content: `[Stub Response] Based on your documentation, here's the answer to: "${query.slice(0, 100)}..."\n\nThis is a stub response for MVP testing. In production, this will be replaced with actual AI-generated content from OpenAI or Anthropic.`,
      model: 'stub-model-v1',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      finishReason: 'stop',
    };
  }

  async *completeStream(request: AICompletionRequest): AsyncIterable<AIStreamChunk> {
    // SCAFFOLD: Not implemented in MVP
    const id = this.generateDeterministicId(request, 'stream');
    yield {
      id,
      delta: '[Stub] Streaming not implemented in MVP',
      finishReason: 'stop',
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }

  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate a deterministic ID from request content.
   * Identical inputs always produce identical IDs.
   */
  private generateDeterministicId(request: AICompletionRequest, prefix = 'stub'): string {
    const content = request.messages.map((m) => `${m.role}:${m.content}`).join('|');
    const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
    return `${prefix}_${hash}`;
  }
}
