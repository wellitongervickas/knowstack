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

| Code                     | HTTP Status | Description                                      |
| ------------------------ | ----------- | ------------------------------------------------ |
| `MISSING_TENANT_HEADER`  | 400         | Required `x-ks-org` or `x-ks-project` header missing |
| `ORGANIZATION_NOT_FOUND` | 404         | Organization slug not found                      |
| `PROJECT_NOT_FOUND`      | 404         | Project slug not found in organization           |

### Validation Errors (4xx)

| Code               | HTTP Status | Description          |
| ------------------ | ----------- | -------------------- |
| `VALIDATION_ERROR` | 400         | Invalid request body |
| `NOT_FOUND`        | 404         | Resource not found   |

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
