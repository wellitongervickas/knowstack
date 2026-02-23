import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestContextService } from '@/common/services/request-context.service';
import { DomainException } from '@/core/exceptions/domain.exception';
import {
  IStructuredLogger,
  IMetricsService,
  STRUCTURED_LOGGER,
  METRICS_SERVICE,
} from '@/core/interfaces/services/observability.interface';

/**
 * Error response format for API errors.
 * Always includes requestId and stable error code.
 */
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

/**
 * Global exception filter that normalizes all errors.
 *
 * Ensures:
 * - All errors include requestId and stable error code
 * - DomainExceptions are mapped to appropriate HTTP status
 * - HttpExceptions preserve their status and code
 * - Unknown errors return 500 with generic message
 * - Stack traces are NEVER leaked to clients (logged only)
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
    private readonly requestContext: RequestContextService,
    @Inject(METRICS_SERVICE)
    private readonly metrics: IMetricsService,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const requestId = this.requestContext.getRequestIdOrUnknown();
    const source = this.requestContext.getSourceOrDefault();

    const { status, code, message } = this.normalizeException(exception);

    // Skip logging for noisy browser requests
    const isFavicon = request.path === '/favicon.ico';
    if (isFavicon) {
      response.status(status).json({ error: { code, message, requestId } });
      return;
    }

    // Log error with full details (including stack trace)
    this.logger.error(message, exception instanceof Error ? exception : undefined, {
      errorCode: code,
      statusCode: status,
    });

    // Record error metric
    this.metrics.incrementQueryErrors({ provider: 'unknown', source });

    // Send normalized response (no stack trace)
    const errorResponse: ErrorResponse = {
      error: {
        code,
        message,
        requestId,
      },
    };

    response.status(status).json(errorResponse);
  }

  private normalizeException(exception: unknown): {
    status: number;
    code: string;
    message: string;
  } {
    // Handle DomainException
    if (exception instanceof DomainException) {
      return {
        status: this.domainCodeToHttpStatus(exception.code),
        code: exception.code,
        message: exception.message,
      };
    }

    // Handle HttpException (NestJS)
    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      let code = 'HTTP_ERROR';
      let message = exception.message;

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        if (typeof resp.code === 'string') {
          code = resp.code;
        }
        if (typeof resp.message === 'string') {
          message = resp.message;
        }
      }

      return {
        status: exception.getStatus(),
        code,
        message,
      };
    }

    // Handle unknown errors (never leak details)
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    };
  }

  private domainCodeToHttpStatus(code: string): number {
    switch (code) {
      case 'INVALID_API_KEY':
      case 'MISSING_API_KEY':
      case 'API_KEY_REVOKED':
      case 'API_KEY_EXPIRED':
      case 'MISSING_AUTH':
      case 'TOKEN_EXPIRED':
      case 'INVALID_TOKEN':
      case 'SESSION_INVALID':
      case 'INVALID_CREDENTIALS':
      case 'SESSION_EXPIRED':
      case 'SESSION_REVOKED':
        return HttpStatus.UNAUTHORIZED;
      case 'FORBIDDEN':
      case 'MCP_SCOPE_INSUFFICIENT':
      case 'CANNOT_REVOKE_KEY':
      case 'NO_PROJECT_ACCESS':
        return HttpStatus.FORBIDDEN;
      case 'NOT_FOUND':
      case 'API_KEY_NOT_FOUND':
      case 'DOCUMENT_NOT_FOUND':
      case 'PROJECT_NOT_FOUND':
      case 'ORGANIZATION_NOT_FOUND':
      case 'MEMBERSHIP_NOT_FOUND':
        return HttpStatus.NOT_FOUND;
      case 'VALIDATION_ERROR':
        return HttpStatus.BAD_REQUEST;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }
}
