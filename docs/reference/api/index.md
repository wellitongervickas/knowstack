[Home](../../index.md) > [Reference](../index.md) > **API Reference**

# API Reference

KnowStack uses MCP (Model Context Protocol) as its primary interface. All interactions happen through the MCP endpoint.

## Base URL

```
http://localhost:3000/api/v1
```

## Tenant Resolution

Tenant context is provided via HTTP headers on every request:

| Header          | Required | Description                            |
| --------------- | -------- | -------------------------------------- |
| `x-ks-org`     | Yes      | Organization slug                      |
| `x-ks-project` | Yes      | Project slug                           |
| `x-ks-context` | No       | JSON array of additional project configs |

---

## Endpoints Overview

### [MCP](mcp.md)

| Method | Path   | Description             |
| ------ | ------ | ----------------------- |
| POST   | `/mcp` | MCP JSON-RPC endpoint   |
| GET    | `/mcp` | MCP SSE endpoint        |

The MCP endpoint provides all document, instruction, query, and memory tools. See [MCP Reference](mcp.md) for the full tool catalog.

### [Admin MCP](admin-mcp.md)

| Method | Path         | Description                          |
| ------ | ------------ | ------------------------------------ |
| POST   | `/mcp/admin` | Admin MCP JSON-RPC endpoint          |
| GET    | `/mcp/admin` | Admin MCP SSE endpoint               |

The Admin MCP endpoint provides organization and project management tools. No tenant headers required. See [Admin MCP Reference](admin-mcp.md) for details.

---

## See Also

- [Common Headers](../integrations/common-headers.md) - Request/response headers
- [Error Handling](../troubleshooting/errors.md) - Error codes and handling
- [MCP Reference](mcp.md) - Full MCP tool documentation
- [Admin MCP Reference](admin-mcp.md) - Organization and project management
