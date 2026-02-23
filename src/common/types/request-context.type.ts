/**
 * Request context for observability.
 * Stored in CLS (AsyncLocalStorage) alongside TenantContext.
 */
export interface RequestContext {
  /** Unique request identifier (from x-request-id header or generated UUID v4) */
  requestId: string;

  /** Request source: 'api' for direct calls, 'mcp' for MCP-proxied requests */
  source: RequestSource;

  /** Request start time (performance.now()) for latency calculation */
  startTime: number;

  /** Client IP address (for audit logging) */
  ipAddress: string | null;

  /** Client User-Agent header (for audit logging) */
  userAgent: string | null;
}

export type RequestSource = 'api' | 'mcp';
