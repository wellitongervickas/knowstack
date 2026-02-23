[Home](../../index.md) > [Reference](../index.md) > [API](index.md) > **Admin MCP**

# Admin MCP API Reference

The Admin MCP endpoint provides tools for managing organizations and projects. These tools operate outside tenant context — no `x-ks-org` or `x-ks-project` headers are required.

This endpoint is used by the [`@knowstack/sdk`](../../../packages/sdk/) CLI during project setup to create organizations and projects before tenant headers exist.

## Endpoint

### POST /api/v1/mcp/admin

Accepts MCP JSON-RPC requests for organization and project management.

**Tenant Resolution:** None — this endpoint does not apply `ConfigTenantMiddleware`.

**Flow:**

1. Create per-request MCP server with admin tools
2. Handle JSON-RPC request using SDK transport
3. Return MCP-formatted response

### Request Example

```bash
curl -X POST http://localhost:3000/api/v1/mcp/admin \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

---

## Tools Reference

The Admin MCP endpoint provides six tools organized into two groups:

| Group | Tools | Description |
| ----- | ----- | ----------- |
| **Organizations** | `create_organization`, `get_organization`, `list_organizations` | Organization CRUD |
| **Projects** | `create_project`, `get_project`, `list_projects` | Project CRUD (scoped to organization) |

---

### knowstack.create_organization

Create a new organization. Slug must be unique, lowercase, and may contain letters, numbers, and hyphens.

**Parameters:**

| Parameter | Type   | Required | Min | Max | Pattern | Description |
| --------- | ------ | -------- | --- | --- | ------- | ----------- |
| `name`    | string | Yes      | 1   | 255 | -       | Organization display name |
| `slug`    | string | Yes      | 1   | 100 | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | URL-safe unique identifier |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "knowstack.create_organization",
    "arguments": {
      "name": "My Organization",
      "slug": "my-org"
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"uuid\",\"name\":\"My Organization\",\"slug\":\"my-org\",\"status\":\"created\"}"
      }
    ]
  }
}
```

**Error Response (slug taken):**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "Slug is already taken" }],
    "isError": true
  }
}
```

---

### knowstack.get_organization

Get an organization by slug. Returns organization details including project count.

**Parameters:**

| Parameter | Type   | Required | Min | Max | Pattern | Description |
| --------- | ------ | -------- | --- | --- | ------- | ----------- |
| `slug`    | string | Yes      | 1   | 100 | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | Organization slug to look up |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "knowstack.get_organization",
    "arguments": {
      "slug": "my-org"
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"uuid\",\"name\":\"My Organization\",\"slug\":\"my-org\",\"projectCount\":3,\"createdAt\":\"2024-01-15T10:00:00Z\"}"
      }
    ]
  }
}
```

**Error Response (not found):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{ "type": "text", "text": "Organization not found" }],
    "isError": true
  }
}
```

---

### knowstack.list_organizations

List all organizations ordered by creation date (newest first). Takes no parameters.

**Parameters:** None

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "knowstack.list_organizations",
    "arguments": {}
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":\"uuid\",\"name\":\"My Organization\",\"slug\":\"my-org\",\"createdAt\":\"2024-01-15T10:00:00Z\"}]"
      }
    ]
  }
}
```

---

### knowstack.create_project

Create a new project within an organization. Project slug must be unique within the organization.

**Parameters:**

| Parameter          | Type   | Required | Min | Max | Pattern | Description |
| ------------------ | ------ | -------- | --- | --- | ------- | ----------- |
| `organizationSlug` | string | Yes      | 1   | 100 | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | Slug of the parent organization |
| `name`             | string | Yes      | 1   | 255 | -       | Project display name |
| `slug`             | string | Yes      | 1   | 100 | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | URL-safe unique identifier (unique within org) |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "knowstack.create_project",
    "arguments": {
      "organizationSlug": "my-org",
      "name": "API Docs",
      "slug": "api-docs"
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"uuid\",\"organizationId\":\"org-uuid\",\"name\":\"API Docs\",\"slug\":\"api-docs\",\"status\":\"created\"}"
      }
    ]
  }
}
```

**Error Response (slug taken):**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [{ "type": "text", "text": "Slug is already taken" }],
    "isError": true
  }
}
```

---

### knowstack.get_project

Get a project by organization slug and project slug. Returns project details including ID.

**Parameters:**

| Parameter          | Type   | Required | Min | Max | Pattern | Description |
| ------------------ | ------ | -------- | --- | --- | ------- | ----------- |
| `organizationSlug` | string | Yes      | 1   | 100 | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | Slug of the parent organization |
| `slug`             | string | Yes      | 1   | 100 | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | Project slug to look up |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "knowstack.get_project",
    "arguments": {
      "organizationSlug": "my-org",
      "slug": "api-docs"
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"id\":\"uuid\",\"organizationId\":\"org-uuid\",\"name\":\"API Docs\",\"slug\":\"api-docs\",\"createdAt\":\"2024-01-15T10:00:00Z\"}"
      }
    ]
  }
}
```

**Error Response (not found):**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [{ "type": "text", "text": "Project not found" }],
    "isError": true
  }
}
```

---

### knowstack.list_projects

List all projects in an organization.

**Parameters:**

| Parameter          | Type   | Required | Min | Max | Pattern | Description |
| ------------------ | ------ | -------- | --- | --- | ------- | ----------- |
| `organizationSlug` | string | Yes      | 1   | 100 | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | Slug of the organization to list projects for |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "knowstack.list_projects",
    "arguments": {
      "organizationSlug": "my-org"
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"id\":\"uuid\",\"name\":\"API Docs\",\"slug\":\"api-docs\",\"createdAt\":\"2024-01-15T10:00:00Z\"}]"
      }
    ]
  }
}
```

---

## Error Handling

Admin tool errors follow the same pattern as the tenant MCP endpoint — errors are returned within a successful JSON-RPC response with the `isError: true` flag.

| Scenario              | Response        | Message                    |
| --------------------- | --------------- | -------------------------- |
| Organization not found | `isError: true` | `Organization not found`  |
| Project not found      | `isError: true` | `Project not found`       |
| Slug already taken     | `isError: true` | `Slug is already taken`   |
| Unexpected error       | `isError: true` | `An unexpected error occurred` |

---

## See Also

- [MCP Reference](mcp.md) - Tenant-scoped MCP tools (documents, instructions, queries)
- [API Reference](index.md) - Endpoint overview
- [SDK Setup Guide](../../guides/sdk-setup.md) - Using the SDK CLI for project setup
