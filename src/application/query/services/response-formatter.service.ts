import { Injectable } from '@nestjs/common';
import { Document } from '@/core/entities/document.entity';
import { AICompletionResponse } from '@/core/interfaces/services/ai-provider.interface';
import { RequestContextService } from '@/common/services/request-context.service';
import {
  QueryResponseDto,
  QuerySourceDto,
  QueryUsageDto,
  QueryMetaDto,
} from '@/application/query/dto/query-response.dto';

/**
 * Response Formatter Service.
 * Formats AI responses into the query response DTO.
 *
 * MVP: Simple passthrough implementation.
 * Future: Implement citation mapping, response enrichment.
 */
@Injectable()
export class ResponseFormatterService {
  constructor(private readonly requestContext: RequestContextService) {}

  /**
   * Format AI response into QueryResponseDto.
   * @param aiResponse - The AI completion response
   * @param documents - Documents used as context
   * @param latencyMs - Processing time in milliseconds
   * @param providerName - Name of the AI provider used
   * @param cacheHit - Whether this response was from cache (default: false)
   */
  format(
    aiResponse: AICompletionResponse,
    documents: Document[],
    latencyMs: number,
    providerName: string,
    cacheHit: boolean = false,
  ): QueryResponseDto {
    const sources: QuerySourceDto[] = documents.map((doc) => ({
      id: doc.id,
      title: doc.title,
    }));

    const usage: QueryUsageDto = {
      promptTokens: aiResponse.usage.promptTokens,
      completionTokens: aiResponse.usage.completionTokens,
      totalTokens: aiResponse.usage.totalTokens,
    };

    const meta: QueryMetaDto = {
      provider: providerName,
      model: aiResponse.model,
      latencyMs,
      requestId: this.requestContext.getRequestIdOrUnknown(),
      cacheHit,
    };

    return {
      answer: aiResponse.content,
      sources,
      usage,
      meta,
    };
  }

  /**
   * Format a cached response, updating latency and requestId.
   * @param cachedResponse - The cached query response
   * @param latencyMs - Current request latency (time to retrieve from cache)
   */
  formatCached(cachedResponse: QueryResponseDto, latencyMs: number): QueryResponseDto {
    return {
      ...cachedResponse,
      meta: {
        ...cachedResponse.meta,
        latencyMs,
        requestId: this.requestContext.getRequestIdOrUnknown(),
        cacheHit: true,
      },
    };
  }
}
