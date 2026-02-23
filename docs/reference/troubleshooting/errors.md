[Home](../../index.md) > [Reference](../index.md) > [Troubleshooting](index.md) > **Errors**

# Error Codes

All errors return a consistent JSON format with request correlation.

## Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "query must be a string",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

| Field             | Description                                     |
| ----------------- | ----------------------------------------------- |
| `error.code`      | Stable error code for programmatic handling     |
| `error.message`   | Human-readable error description                |
| `error.requestId` | Unique request ID for correlation and debugging |

## Error Codes

### Tenant Resolution Errors (4xx)

Thrown by `ConfigTenantMiddleware` as NestJS `BadRequestException` (not domain exceptions).

| Code                     | HTTP Status | Description                                      |
| ------------------------ | ----------- | ------------------------------------------------ |
| `MISSING_TENANT_HEADER`  | 400         | Required `x-ks-org` or `x-ks-project` header missing |
| `ORGANIZATION_NOT_FOUND` | 400         | Organization slug not found                      |
| `PROJECT_NOT_FOUND`      | 400         | Project slug not found in organization           |

### Validation Errors (4xx)

| Code               | HTTP Status | Description          |
| ------------------ | ----------- | -------------------- |
| `VALIDATION_ERROR` | 400         | Invalid request body |
| `NOT_FOUND`        | 404         | Resource not found   |

### Document Domain Errors (4xx)

| Code                 | HTTP Status | Description                        |
| -------------------- | ----------- | ---------------------------------- |
| `DOCUMENT_NOT_FOUND` | 404         | Document ID does not exist in project |

### Instruction Domain Errors (4xx/5xx)

| Code                                | HTTP Status | Description                                 |
| ----------------------------------- | ----------- | ------------------------------------------- |
| `INSTRUCTION_NOT_FOUND`             | 404         | Instruction not found by name/type          |
| `INSTRUCTION_DUPLICATE`             | 409         | Instruction with same name/type already exists |
| `INSTRUCTION_VISIBILITY_FORBIDDEN`  | 403         | Cannot set PUBLIC visibility via API        |
| `MEMORY_ENTRY_NOT_FOUND`            | 404         | Memory entry not found by name              |
| `MEMORY_CONTENT_REPLACE_ERROR`      | 400         | str_replace: `old_str` not found or ambiguous |

### Embedding Domain Errors (5xx)

| Code                               | HTTP Status | Description                                |
| ---------------------------------- | ----------- | ------------------------------------------ |
| `EMBEDDING_API_ERROR`              | 500         | Embedding provider API call failed         |
| `EMBEDDING_NOT_CONFIGURED`         | 500         | Embedding provider not configured          |
| `EMBEDDING_RATE_LIMITED`           | 500         | Embedding API rate limit exceeded          |
| `EMBEDDING_TOKEN_LIMIT_EXCEEDED`   | 500         | Input exceeds model token limit            |
| `EMBEDDING_DISABLED`               | 500         | Embedding feature is disabled              |
| `VECTOR_SEARCH_FAILED`            | 500         | Vector similarity search failed            |
| `PGVECTOR_NOT_INSTALLED`          | 500         | pgvector PostgreSQL extension not installed |

### Server Errors (5xx)

| Code                     | HTTP Status | Description             |
| ------------------------ | ----------- | ----------------------- |
| `QUERY_EXECUTION_FAILED` | 500         | Query processing failed |
| `INTERNAL_ERROR`         | 500         | Unexpected server error |

## Examples

### 400 Bad Request

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "query must be a string",
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

### 500 Internal Server Error

```json
{
  "error": {
    "code": "QUERY_EXECUTION_FAILED",
    "message": "Failed to execute query. Please try again.",
    "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }
}
```

## MCP Tool Error Pattern

MCP tools return errors within a successful JSON-RPC response using the `isError: true` flag. These are **not** HTTP errors — the HTTP status is always `200 OK`.

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "Document not found" }],
    "isError": true
  }
}
```

Common MCP tool error scenarios:

| Tool | Error | Description |
| ---- | ----- | ----------- |
| `get_documents` | Document not found | Document ID does not exist |
| `save_documents` | Missing content/URL | Neither `content` nor `sourceUrl` provided |
| `delete_agents/commands/skills/templates` | Instruction not found | Instruction name does not exist |
| `update_memory` | Entry not found | Memory entry name does not exist |
| `update_memory` | Replace error | `old_str` not found or matches multiple times |
| `backfill_instructions` | Embeddings disabled | `EMBEDDING_ENABLED=false` |
| `backfill_embeddings` | Embeddings disabled | `EMBEDDING_ENABLED=false` |
| `query` | Query failed | AI provider or context builder error |

## HTTP Status Mapping

The `GlobalExceptionFilter` maps domain exception codes to HTTP status codes:

| HTTP Status | Domain Codes |
| ----------- | ------------ |
| **400** | `VALIDATION_ERROR` |
| **401** | `INVALID_API_KEY`, `MISSING_API_KEY`, `API_KEY_REVOKED`, `API_KEY_EXPIRED`, `MISSING_AUTH`, `TOKEN_EXPIRED`, `INVALID_TOKEN`, `SESSION_INVALID`, `INVALID_CREDENTIALS`, `SESSION_EXPIRED`, `SESSION_REVOKED` |
| **403** | `FORBIDDEN`, `MCP_SCOPE_INSUFFICIENT`, `CANNOT_REVOKE_KEY`, `NO_PROJECT_ACCESS` |
| **404** | `NOT_FOUND`, `API_KEY_NOT_FOUND`, `DOCUMENT_NOT_FOUND`, `PROJECT_NOT_FOUND`, `ORGANIZATION_NOT_FOUND`, `MEMBERSHIP_NOT_FOUND` |
| **500** | All unmapped codes (default) |

> **Note:** Tenant resolution errors (`MISSING_TENANT_HEADER`, `ORGANIZATION_NOT_FOUND`, `PROJECT_NOT_FOUND`) are thrown as NestJS `BadRequestException` by `ConfigTenantMiddleware` before the filter is reached — they always return HTTP 400.

> **Note:** Embedding exceptions (`EMBEDDING_API_ERROR`, etc.) are not mapped in the filter — they surface as HTTP 500. In MCP context, they are caught by the tool handler and returned as `isError: true` responses.

## Handling Errors

```typescript
try {
  const response = await fetch('/api/v1/mcp', { ... });

  if (!response.ok) {
    const { error } = await response.json();

    console.error(`Request ${error.requestId} failed: ${error.code}`);

    switch (error.code) {
      case 'MISSING_TENANT_HEADER':
        // Ensure x-ks-org and x-ks-project headers are set
        break;
      case 'VALIDATION_ERROR':
        // Fix request body
        break;
      case 'NOT_FOUND':
        // Resource does not exist
        break;
      default:
        // Log requestId and show generic error
    }
  }
} catch (error) {
  // Network error
}
```

## Request Correlation

Every error includes a `requestId` that can be used to:

- Correlate errors with server logs
- Debug issues with support
- Track requests across MCP proxy and API

If you provide `x-request-id` header, that value is used. Otherwise, a UUID is generated.

## See Also

- [MCP Reference](../api/mcp.md) - MCP tool documentation
- [Observability](../../explanation/architecture/observability.md)
