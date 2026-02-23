import { Injectable, Logger, NotImplementedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import {
  IAIProvider,
  AICompletionRequest,
  AICompletionResponse,
  AIStreamChunk,
  AIFinishReason,
  AIMessage,
} from '@/core/interfaces/services/ai-provider.interface';
import { BaseAIProvider } from '@/infrastructure/ai/providers/base-ai.provider';

/**
 * OpenAI Provider Implementation.
 *
 * Responsibilities:
 * - Maps internal request/response types to OpenAI SDK
 * - Measures latency for observability
 * - Encapsulates all OpenAI SDK usage (no type leakage)
 * - Handles errors with meaningful messages
 */
@Injectable()
export class OpenAIProvider extends BaseAIProvider implements IAIProvider {
  readonly name = 'openai';
  private readonly logger = new Logger(OpenAIProvider.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    super();

    const apiKey = this.configService.get<string>('ai.openai.apiKey');
    this.model = this.configService.get<string>('ai.openai.model') || 'gpt-4o-mini';
    const maxRetries = this.configService.get<number>('ai.openai.maxRetries') || 3;
    const timeout = this.configService.get<number>('ai.openai.timeout') || 30000;

    this.client = new OpenAI({
      apiKey: apiKey || '',
      maxRetries,
      timeout,
    });
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    this.validateRequest(request);

    const startTime = performance.now();

    try {
      const openaiMessages = this.mapMessagesToOpenAI(request.messages);

      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: openaiMessages,
        max_tokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
        stop: request.stopSequences,
      });

      const latencyMs = performance.now() - startTime;
      this.logger.debug(`OpenAI completion took ${latencyMs.toFixed(2)}ms`);

      return this.mapResponseFromOpenAI(response);
    } catch (error) {
      const latencyMs = performance.now() - startTime;
      this.logger.error(
        `OpenAI completion failed after ${latencyMs.toFixed(2)}ms`,
        error instanceof Error ? error.stack : String(error),
      );
      throw this.normalizeError(error);
    }
  }

  // eslint-disable-next-line require-yield
  async *completeStream(_request: AICompletionRequest): AsyncIterable<AIStreamChunk> {
    // SCAFFOLD: Streaming not implemented for MVP
    throw new NotImplementedException(
      'OpenAI streaming is not implemented. Use complete() for now.',
    );
  }

  async healthCheck(): Promise<boolean> {
    const apiKey = this.configService.get<string>('ai.openai.apiKey');

    if (!apiKey) {
      this.logger.debug('OpenAI health check skipped: no API key configured');
      return false;
    }

    try {
      // Minimal chat completion to verify capability
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0,
      });
      return true;
    } catch (error) {
      this.logger.warn(
        `OpenAI health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }

  // ============= Private Mapping Methods =============

  /**
   * Map internal messages to OpenAI chat message format.
   * OpenAI types stay inside this method.
   */
  private mapMessagesToOpenAI(messages: AIMessage[]): OpenAI.Chat.ChatCompletionMessageParam[] {
    return messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));
  }

  /**
   * Map OpenAI response to internal AICompletionResponse.
   * OpenAI types stay inside this method.
   */
  private mapResponseFromOpenAI(response: OpenAI.Chat.ChatCompletion): AICompletionResponse {
    const choice = response.choices[0];

    if (!choice) {
      throw new Error('OpenAI returned no choices');
    }

    return {
      id: response.id,
      content: choice.message?.content || '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      finishReason: this.mapFinishReason(choice.finish_reason),
    };
  }

  /**
   * Map OpenAI finish reason to internal AIFinishReason.
   */
  private mapFinishReason(
    reason: OpenAI.Chat.ChatCompletion.Choice['finish_reason'],
  ): AIFinishReason {
    switch (reason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'error';
    }
  }

  /**
   * Normalize OpenAI errors - shallow approach, preserve original info.
   */
  private normalizeError(error: unknown): Error {
    if (error instanceof OpenAI.APIError) {
      // Preserve original message and status for debugging
      return new Error(`OpenAI API error (${error.status}): ${error.message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error(`OpenAI error: ${String(error)}`);
  }
}
