import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { RequestContextService } from '@/common/services/request-context.service';
import {
  IStructuredLogger,
  IMetricsService,
  STRUCTURED_LOGGER,
  METRICS_SERVICE,
} from '@/core/interfaces/services/observability.interface';

/**
 * Global logging interceptor for request/response logging.
 *
 * Logs:
 * - Request start with method, path
 * - Request end with status code, latency
 *
 * Also records metrics for successful requests.
 * Error logging is handled by GlobalExceptionFilter.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
    private readonly requestContext: RequestContextService,
    @Inject(METRICS_SERVICE)
    private readonly metrics: IMetricsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, path } = request;

    // Skip logging for noisy browser requests
    if (path === '/favicon.ico') {
      return next.handle();
    }

    // Log request start
    this.logger.info('Request started', { method, path });

    return next.handle().pipe(
      tap({
        next: (responseBody) => {
          this.handleSuccess(method, path, responseBody);
        },
        // Error logging is handled by GlobalExceptionFilter
      }),
    );
  }

  private handleSuccess(method: string, path: string, responseBody: unknown): void {
    const latencyMs = this.requestContext.getElapsedMs();
    const source = this.requestContext.getSourceOrDefault();

    // Extract provider and tokens from response if available (for /query)
    let provider = 'unknown';
    let model: string | undefined;
    let totalTokens: number | undefined;

    if (this.isQueryResponse(responseBody)) {
      provider = responseBody.meta?.provider ?? 'unknown';
      model = responseBody.meta?.model;
      totalTokens = responseBody.usage?.totalTokens;

      // Record query-specific metrics
      this.metrics.incrementQueryTotal({ provider, source });
      this.metrics.recordQueryLatency(latencyMs, { provider, source });
    }

    // Log request completion
    this.logger.info('Request completed', {
      method,
      path,
      statusCode: 200,
      latencyMs,
      provider: provider !== 'unknown' ? provider : undefined,
      model,
      totalTokens,
    });
  }

  private isQueryResponse(body: unknown): body is QueryResponseShape {
    if (!body || typeof body !== 'object') return false;
    const obj = body as Record<string, unknown>;
    return (
      'meta' in obj &&
      typeof obj.meta === 'object' &&
      obj.meta !== null &&
      'provider' in (obj.meta as Record<string, unknown>)
    );
  }
}

/**
 * Shape of QueryResponseDto for type checking.
 * Does not import actual DTO to avoid circular dependencies.
 */
interface QueryResponseShape {
  meta?: {
    provider?: string;
    model?: string;
  };
  usage?: {
    totalTokens?: number;
  };
}
