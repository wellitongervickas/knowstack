import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContextService } from '@/common/services/request-context.service';
import { RequestSource } from '@/common/types/request-context.type';
import { TRUST_PROXY } from '@/app.settings';
import {
  MAX_REQUEST_ID_LENGTH,
  UUID_V4_PATTERN,
} from '@/common/constants/request-context.constants';

/**
 * Middleware that initializes request context for observability.
 *
 * Runs before guards to ensure requestId is available throughout the request lifecycle.
 *
 * Headers:
 * - x-request-id: If present, used as requestId; otherwise UUID v4 is generated
 * - x-source: If 'mcp', source is set to 'mcp'; otherwise defaults to 'api'
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const requestId = this.extractRequestId(req);
    const source = this.extractSource(req);
    const ipAddress = this.extractIpAddress(req);
    const userAgent = this.extractUserAgent(req);

    this.requestContext.setContext({
      requestId,
      source,
      startTime: performance.now(),
      ipAddress,
      userAgent,
    });

    next();
  }

  private extractRequestId(req: Request): string {
    const headerValue = req.headers['x-request-id'];
    // Validate format and length to prevent log injection
    if (
      typeof headerValue === 'string' &&
      headerValue.length > 0 &&
      headerValue.length <= MAX_REQUEST_ID_LENGTH &&
      UUID_V4_PATTERN.test(headerValue)
    ) {
      return headerValue;
    }
    return randomUUID();
  }

  private extractSource(req: Request): RequestSource {
    const sourceHeader = req.headers['x-source'];
    if (sourceHeader === 'mcp') {
      return 'mcp';
    }
    return 'api';
  }

  private extractIpAddress(req: Request): string | null {
    // Only trust x-forwarded-for when explicitly configured (behind trusted proxy)
    // This prevents IP spoofing when not behind a proxy
    if (TRUST_PROXY) {
      const forwardedFor = req.headers['x-forwarded-for'];
      if (typeof forwardedFor === 'string') {
        // Take the first IP in the chain (client IP)
        return forwardedFor.split(',')[0].trim();
      }
    }
    // Fall back to socket remote address (always trustworthy)
    return req.socket?.remoteAddress ?? req.ip ?? null;
  }

  private extractUserAgent(req: Request): string | null {
    const userAgent = req.headers['user-agent'];
    return typeof userAgent === 'string' ? userAgent : null;
  }
}
