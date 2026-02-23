[Home](../../index.md) > [Explanation](../index.md) > [Architecture](index.md) > **Observability**

# Observability

KnowStack API includes built-in observability features for debugging and monitoring in production.

## Features

### Request ID Propagation

Every request gets a unique `requestId` for correlation across logs and responses.

**Headers:**

- `x-request-id`: If provided, this value is used as the request ID
- If not provided, a UUID v4 is generated automatically

**Source Detection:**

- Default source is `mcp` for MCP protocol requests

**Response:**

```json
{
  "answer": "...",
  "meta": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "latencyMs": 450,
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### Structured Logging

All logs are emitted in JSON format with consistent fields:

```json
{
  "timestamp": "2026-01-26T12:30:00.000Z",
  "level": "info",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "source": "api",
  "organizationId": "org_xxx",
  "projectId": "proj_xxx",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "latencyMs": 450,
  "totalTokens": 1200,
  "message": "Query completed"
}
```

**Log Points:**

- Request start
- Request completion (with metrics)
- Errors (with stack trace in logs only, never to clients)

### Metrics (Internal Only)

Metrics are collected internally via `IMetricsService` but are not exposed via an HTTP endpoint — all operations go through MCP.

### Error Responses

All errors include `requestId` and a stable `code`:

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid or expired API key.",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 400 | Invalid request body |
| `QUERY_EXECUTION_FAILED` | 500 | Query processing failed |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Architecture

### Components

```
src/
├── common/
│   ├── types/request-context.type.ts      # RequestContext interface
│   ├── services/request-context.service.ts # CLS-based context storage
│   ├── middleware/request-context.middleware.ts # Sets requestId before guards
│   ├── interceptors/logging.interceptor.ts # Request/response logging
│   └── filters/global-exception.filter.ts  # Error normalization
├── core/interfaces/services/
│   └── observability.interface.ts          # IStructuredLogger, IMetricsService
└── infrastructure/observability/
    ├── observability.module.ts
    └── services/
        ├── structured-logger.service.ts
        └── metrics.service.ts
```

### Request Lifecycle

```
HTTP Request (POST/GET /api/v1/mcp)
    ↓
[CLS Middleware] - AsyncLocalStorage initialized
    ↓
[RequestContextMiddleware] - Sets requestId, source in CLS
    ↓
[ConfigTenantMiddleware] - Resolves org/project from headers → TenantContext
    ↓
[McpController] - Creates MCP session, delegates to transport
    ↓
[MCP Tool Handler] - Routes to application services
    ↓
HTTP Response (MCP protocol / SSE)
```

## Usage Examples

### Correlating MCP Requests

```bash
# MCP request with trace ID
curl -X POST http://localhost:3000/api/v1/mcp \
  -H "x-ks-org: my-org" \
  -H "x-ks-project: my-project" \
  -H "x-request-id: mcp-trace-12345" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "tools/call", ...}'
```

Logs will show:

```json
{"requestId": "mcp-trace-12345", "source": "mcp", ...}
```

## Future Enhancements (Scaffolded)

The following interfaces are defined but not yet implemented:

- **ITraceContext**: Distributed tracing (OpenTelemetry)
- **IErrorReporter**: External error reporting (Sentry)

See `src/core/interfaces/services/observability.interface.ts` for interface definitions.

## See Also

- [Architecture Overview](overview.md)
- [Caching](caching.md)
