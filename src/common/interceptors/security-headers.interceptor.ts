import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Observable } from 'rxjs';
import {
  SECURITY_HEADERS,
  SECURITY_HEADER_VALUES,
  ENCRYPTION_CONFIG_KEYS,
} from '@/application/security/security.constants';

@Injectable()
export class SecurityHeadersInterceptor implements NestInterceptor {
  private readonly headers: Record<string, string>;

  constructor(private readonly configService: ConfigService) {
    const algorithm = this.configService.get<string>(ENCRYPTION_CONFIG_KEYS.ALGORITHM);

    this.headers = {
      [SECURITY_HEADERS.DATA_PRIVACY]: SECURITY_HEADER_VALUES.DATA_PRIVACY,
      [SECURITY_HEADERS.CONTENT_TYPE_OPTIONS]: SECURITY_HEADER_VALUES.CONTENT_TYPE_OPTIONS,
      [SECURITY_HEADERS.FRAME_OPTIONS]: SECURITY_HEADER_VALUES.FRAME_OPTIONS,
      [SECURITY_HEADERS.STRICT_TRANSPORT_SECURITY]: SECURITY_HEADER_VALUES.HSTS,
    };

    if (algorithm) {
      this.headers[SECURITY_HEADERS.ENCRYPTION_STATUS] = algorithm;
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse();
    Object.entries(this.headers).forEach(([key, value]) => {
      response.setHeader(key, value);
    });
    return next.handle();
  }
}
