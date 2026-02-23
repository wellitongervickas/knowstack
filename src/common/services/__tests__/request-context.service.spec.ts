import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RequestContextService } from '@/common/services/request-context.service';
import { ClsService } from 'nestjs-cls';

describe('RequestContextService', () => {
  let service: RequestContextService;
  let clsService: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    clsService = {
      get: vi.fn(),
      set: vi.fn(),
    };

    service = new RequestContextService(clsService as unknown as ClsService);
  });

  describe('setContext', () => {
    it('should store context in CLS', () => {
      const context = {
        requestId: 'test-uuid',
        source: 'api' as const,
        startTime: 1000,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      };

      service.setContext(context);

      expect(clsService.set).toHaveBeenCalledWith('requestContext', context);
    });
  });

  describe('getRequestIdOrUnknown', () => {
    it('should return requestId when context exists', () => {
      clsService.get.mockReturnValue({
        requestId: 'test-uuid',
        source: 'api',
        startTime: 1000,
      });

      expect(service.getRequestIdOrUnknown()).toBe('test-uuid');
    });

    it('should return "unknown" when context is null', () => {
      clsService.get.mockReturnValue(undefined);

      expect(service.getRequestIdOrUnknown()).toBe('unknown');
    });
  });

  describe('getSourceOrDefault', () => {
    it('should return source when context exists', () => {
      clsService.get.mockReturnValue({
        requestId: 'test-uuid',
        source: 'mcp',
        startTime: 1000,
      });

      expect(service.getSourceOrDefault()).toBe('mcp');
    });

    it('should return "api" as default when context is null', () => {
      clsService.get.mockReturnValue(undefined);

      expect(service.getSourceOrDefault()).toBe('api');
    });
  });

  describe('getElapsedMs', () => {
    it('should return elapsed time when context exists', () => {
      const startTime = performance.now() - 100;
      clsService.get.mockReturnValue({
        requestId: 'test-uuid',
        source: 'api',
        startTime,
      });

      const elapsed = service.getElapsedMs();

      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(200);
    });

    it('should return 0 when context is null', () => {
      clsService.get.mockReturnValue(undefined);

      expect(service.getElapsedMs()).toBe(0);
    });
  });
});
