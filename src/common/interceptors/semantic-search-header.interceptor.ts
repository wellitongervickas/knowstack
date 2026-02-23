import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response } from 'express';
import { ClsService } from 'nestjs-cls';
import {
  RETRIEVAL_META_CLS_KEY,
  RETRIEVAL_METHODS,
  SEMANTIC_SEARCH_HEADERS,
} from '@/application/embedding/embedding.constants';
import type { RetrievalMetadata } from '@/application/query/dto/retrieval-metadata.dto';

/**
 * Interceptor that injects semantic search headers into responses.
 *
 * Reads the retrieval metadata from CLS (set by QueryOrchestratorService)
 * and adds headers indicating semantic search status and document count.
 *
 * Headers:
 * - X-Semantic-Search: "true" | "false" - whether semantic search was used
 * - X-Semantic-Search-Docs: number - count of documents retrieved
 *
 * Graceful degradation: If no metadata available, headers are omitted.
 */
@Injectable()
export class SemanticSearchHeaderInterceptor implements NestInterceptor {
  constructor(private readonly cls: ClsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data) => {
        this.setSemanticSearchHeaders(context);
        return data;
      }),
    );
  }

  private setSemanticSearchHeaders(context: ExecutionContext): void {
    const retrievalMeta = this.cls.get<RetrievalMetadata>(RETRIEVAL_META_CLS_KEY);

    if (!retrievalMeta) {
      return;
    }

    const response = context.switchToHttp().getResponse<Response>();

    // Semantic search is considered "used" when:
    // - Method was hybrid (semantic search attempted)
    // - No fallback was triggered
    const usedSemanticSearch =
      retrievalMeta.method === RETRIEVAL_METHODS.HYBRID && !retrievalMeta.fallbackUsed;

    response.setHeader(SEMANTIC_SEARCH_HEADERS.SEMANTIC_SEARCH, usedSemanticSearch.toString());
    response.setHeader(
      SEMANTIC_SEARCH_HEADERS.SEMANTIC_DOCS,
      retrievalMeta.documentsRetrieved.toString(),
    );
  }
}
