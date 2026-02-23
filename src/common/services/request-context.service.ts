import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { RequestContext, RequestSource } from '@/common/types/request-context.type';

const REQUEST_CONTEXT_KEY = 'requestContext';

/**
 * Service for managing request-scoped observability context.
 * Uses nestjs-cls (AsyncLocalStorage) to store request information
 * throughout the request lifecycle.
 *
 * Set by RequestContextMiddleware before guards run.
 */
@Injectable()
export class RequestContextService {
  constructor(private readonly cls: ClsService) {}

  /**
   * Set the request context for the current request.
   * Called by RequestContextMiddleware at the start of each request.
   */
  setContext(context: RequestContext): void {
    this.cls.set(REQUEST_CONTEXT_KEY, context);
  }

  /**
   * Get the request context for the current request.
   * Throws if context is not set.
   */
  getContext(): RequestContext {
    const context = this.cls.get<RequestContext>(REQUEST_CONTEXT_KEY);
    if (!context) {
      throw new Error('RequestContext not initialized. Ensure RequestContextMiddleware has run.');
    }
    return context;
  }

  /**
   * Get the request context or null if not set.
   * Useful for scenarios where context may not be available.
   */
  getContextOrNull(): RequestContext | null {
    return this.cls.get<RequestContext>(REQUEST_CONTEXT_KEY) ?? null;
  }

  /**
   * Get the request ID from the current context.
   */
  getRequestId(): string {
    return this.getContext().requestId;
  }

  /**
   * Get the request ID or 'unknown' if context not set.
   */
  getRequestIdOrUnknown(): string {
    return this.getContextOrNull()?.requestId ?? 'unknown';
  }

  /**
   * Get the request source from the current context.
   */
  getSource(): RequestSource {
    return this.getContext().source;
  }

  /**
   * Get the request source or 'api' as default.
   */
  getSourceOrDefault(): RequestSource {
    return this.getContextOrNull()?.source ?? 'api';
  }

  /**
   * Get elapsed time in milliseconds since request start.
   */
  getElapsedMs(): number {
    const context = this.getContextOrNull();
    if (!context) {
      return 0;
    }
    return Math.round(performance.now() - context.startTime);
  }
}
