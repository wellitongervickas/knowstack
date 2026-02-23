import { describe, it, expect, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { SecurityHeadersInterceptor } from '@/common/interceptors/security-headers.interceptor';
import {
  SECURITY_HEADERS,
  SECURITY_HEADER_VALUES,
  ENCRYPTION_ALGORITHM,
  ENCRYPTION_CONFIG_KEYS,
} from '@/application/security/security.constants';

describe('SecurityHeadersInterceptor', () => {
  const createInterceptor = (algorithm = ENCRYPTION_ALGORITHM) => {
    const configService = {
      get: vi.fn((key: string) => {
        if (key === ENCRYPTION_CONFIG_KEYS.ALGORITHM) return algorithm;
        return undefined;
      }),
    } as unknown as ConfigService;

    return new SecurityHeadersInterceptor(configService);
  };

  const createMockContext = () => {
    const mockSetHeader = vi.fn();
    const mockResponse = { setHeader: mockSetHeader };
    const mockContext = {
      switchToHttp: () => ({ getResponse: () => mockResponse }),
    } as unknown as ExecutionContext;

    return { mockContext, mockSetHeader };
  };

  describe('constructor', () => {
    it('should initialize headers with configured encryption algorithm', () => {
      const interceptor = createInterceptor('aes-128-gcm');
      expect(interceptor['headers'][SECURITY_HEADERS.ENCRYPTION_STATUS]).toBe('aes-128-gcm');
    });

    it('should read algorithm from config without hardcoded fallback', () => {
      const getSpy = vi.fn((key: string) => {
        if (key === ENCRYPTION_CONFIG_KEYS.ALGORITHM) return ENCRYPTION_ALGORITHM;
        return undefined;
      });
      const configService = { get: getSpy } as unknown as ConfigService;

      new SecurityHeadersInterceptor(configService);

      expect(getSpy).toHaveBeenCalledWith(ENCRYPTION_CONFIG_KEYS.ALGORITHM);
      expect(getSpy.mock.calls.find((c) => c[0] === ENCRYPTION_CONFIG_KEYS.ALGORITHM)).toHaveLength(
        1,
      );
    });
  });

  describe('intercept', () => {
    it('should set all 5 security headers', () => {
      const interceptor = createInterceptor();
      const { mockContext, mockSetHeader } = createMockContext();
      const mockNext = { handle: () => of('result') } as CallHandler;

      interceptor.intercept(mockContext, mockNext);

      expect(mockSetHeader).toHaveBeenCalledWith(
        SECURITY_HEADERS.DATA_PRIVACY,
        SECURITY_HEADER_VALUES.DATA_PRIVACY,
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        SECURITY_HEADERS.ENCRYPTION_STATUS,
        ENCRYPTION_ALGORITHM,
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        SECURITY_HEADERS.CONTENT_TYPE_OPTIONS,
        SECURITY_HEADER_VALUES.CONTENT_TYPE_OPTIONS,
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        SECURITY_HEADERS.FRAME_OPTIONS,
        SECURITY_HEADER_VALUES.FRAME_OPTIONS,
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        SECURITY_HEADERS.STRICT_TRANSPORT_SECURITY,
        SECURITY_HEADER_VALUES.HSTS,
      );
      expect(mockSetHeader).toHaveBeenCalledTimes(5);
    });

    it('should set headers before calling next.handle()', () => {
      const interceptor = createInterceptor();
      const { mockContext, mockSetHeader } = createMockContext();
      const handleSpy = vi.fn(() => of('result'));
      const mockNext = { handle: handleSpy } as unknown as CallHandler;

      interceptor.intercept(mockContext, mockNext);

      expect(mockSetHeader).toHaveBeenCalled();
      expect(handleSpy).toHaveBeenCalled();
    });

    it('should return the observable from next.handle()', async () => {
      const interceptor = createInterceptor();
      const { mockContext } = createMockContext();
      const mockNext = { handle: () => of('test-result') } as CallHandler;

      const result$ = interceptor.intercept(mockContext, mockNext);

      const value = await new Promise((resolve) => {
        result$.subscribe({ next: resolve });
      });

      expect(value).toBe('test-result');
    });

    it('should set X-Data-Privacy to no-ai-training', () => {
      const interceptor = createInterceptor();
      const { mockContext, mockSetHeader } = createMockContext();
      const mockNext = { handle: () => of('result') } as CallHandler;

      interceptor.intercept(mockContext, mockNext);

      expect(mockSetHeader).toHaveBeenCalledWith(
        SECURITY_HEADERS.DATA_PRIVACY,
        SECURITY_HEADER_VALUES.DATA_PRIVACY,
      );
    });

    it('should set X-Encryption-Status from config', () => {
      const interceptor = createInterceptor(ENCRYPTION_ALGORITHM);
      const { mockContext, mockSetHeader } = createMockContext();
      const mockNext = { handle: () => of('result') } as CallHandler;

      interceptor.intercept(mockContext, mockNext);

      expect(mockSetHeader).toHaveBeenCalledWith(
        SECURITY_HEADERS.ENCRYPTION_STATUS,
        ENCRYPTION_ALGORITHM,
      );
    });

    it('should set standard security headers', () => {
      const interceptor = createInterceptor();
      const { mockContext, mockSetHeader } = createMockContext();
      const mockNext = { handle: () => of('result') } as CallHandler;

      interceptor.intercept(mockContext, mockNext);

      expect(mockSetHeader).toHaveBeenCalledWith(
        SECURITY_HEADERS.CONTENT_TYPE_OPTIONS,
        SECURITY_HEADER_VALUES.CONTENT_TYPE_OPTIONS,
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        SECURITY_HEADERS.FRAME_OPTIONS,
        SECURITY_HEADER_VALUES.FRAME_OPTIONS,
      );
      expect(mockSetHeader).toHaveBeenCalledWith(
        SECURITY_HEADERS.STRICT_TRANSPORT_SECURITY,
        SECURITY_HEADER_VALUES.HSTS,
      );
    });
  });
});
