[Home](../../index.md) > [Reference](../index.md) > [Integrations](index.md) > **Common Headers**

# Common Headers

Headers used in KnowStack API requests and responses.

## Request Headers

| Header          | Required | Description                                                     |
| --------------- | -------- | --------------------------------------------------------------- |
| `Content-Type`  | Yes      | Always `application/json`                                       |
| `x-ks-org`     | Yes      | Organization slug for tenant resolution                         |
| `x-ks-project` | Yes      | Project slug for tenant resolution                              |
| `x-ks-context` | No       | JSON array of additional project configs                        |
| `x-request-id`  | No       | Request correlation ID (UUID generated if not provided)         |
| `x-source`      | No       | Source identifier (e.g., `mcp`)                                 |

## See Also

- [API Reference](../api/index.md) - Complete endpoint documentation
- [MCP Reference](../api/mcp.md) - MCP tools and configuration
- [Error Codes](../troubleshooting/errors.md) - Error response format and `requestId` correlation
