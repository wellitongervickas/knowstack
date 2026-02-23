[Home](../../index.md) > [Reference](../index.md) > [API](index.md) > **MCP**

# Model Context Protocol (MCP) API Reference

Model Context Protocol enables AI assistants to query and browse KnowStack documentation through a standardized protocol. Any MCP-compatible tool can connect — IDEs, CLI agents, chat interfaces, and custom integrations.

The MCP endpoint is a stateless JSON-RPC server that accepts MCP requests and provides tools for documentation access and semantic search.

## Endpoint

### POST /api/v1/mcp

Accepts MCP JSON-RPC requests and returns standardized MCP responses.

**Tenant Resolution:** Config headers (`x-ks-org` and `x-ks-project`)

**Flow:**

1. Resolve tenant context via `ConfigTenantMiddleware` (reads `x-ks-org` and `x-ks-project` headers)
2. Create per-request MCP server with Zod-validated tools
3. Handle JSON-RPC request using SDK transport
4. Return MCP-formatted response

---

## Tenant Headers

All requests to the MCP endpoint require tenant context via config headers:

| Header          | Required | Example                     | Description          |
| --------------- | -------- | --------------------------- | -------------------- |
| `x-ks-org`     | Yes      | `x-ks-org: my-org`          | Organization slug    |
| `x-ks-project` | Yes      | `x-ks-project: api-docs`    | Project slug         |
| `x-ks-context` | No       | JSON array of project configs | Additional context projects |

### Request Example

```bash
curl -X POST http://localhost:3000/api/v1/mcp \
  -H "x-ks-org: my-org" \
  -H "x-ks-project: api-docs" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Error Responses

| Status | Cause                                             |
| ------ | ------------------------------------------------- |
| 400    | Missing `x-ks-org` or `x-ks-project` header      |
| 400    | Organization slug not found                       |
| 400    | Project slug not found in organization            |

---

## Stateless Mode

The MCP endpoint operates in stateless mode:

- **No sessions**: Each request creates a fresh MCP server instance
- **No connection pooling**: Per-request overhead; trades simplicity for throughput
- **POST and GET supported**: Both route through the SDK transport
- **DELETE returns 405**: No session termination (stateless by design)
- **No `mcp-session-id` in responses**: Responses contain only standard MCP fields

### Unsupported HTTP Methods

```bash
# DELETE returns 405 Method Not Allowed
curl -X DELETE http://localhost:3000/api/v1/mcp \
  -H "x-ks-org: my-org" \
  -H "x-ks-project: api-docs"
# Response: 405 Method Not Allowed
```

---

## Tools Reference

The MCP endpoint provides twenty-three tools organized into ten groups:

| Group | Tools | Description |
| ----- | ----- | ----------- |
| **Query** | `query` | AI-powered natural language search |
| **Documents** | `get_documents`, `save_documents`, `delete_documents` | Document CRUD with content-hash deduplication |
| **Agents** | `get_agents`, `save_agents`, `delete_agents` | Agent instruction management |
| **Commands** | `get_commands`, `save_commands`, `delete_commands` | Command instruction management |
| **Skills** | `get_skills`, `save_skills`, `delete_skills` | Skill instruction management |
| **Templates** | `get_templates`, `save_templates`, `delete_templates` | Template instruction management |
| **Memory** | `get_memory`, `save_memory`, `update_memory`, `delete_memory` | Project-scoped memory entries |
| **Search** | `search_instructions` | Cross-type instruction discovery (hybrid: vector + keyword) |
| **Backfill** | `backfill_instructions`, `backfill_embeddings` | Generate vector embeddings for instructions and documents |

Instruction tools (agents, commands, skills, templates, memory) support 3-tier visibility (`PUBLIC` < `ORGANIZATION` < `PRIVATE`) with optional filtering.

---

### knowstack.query

Execute a natural language query against the project documentation. Returns an AI-generated answer with cited sources.

**Parameters:**

| Parameter | Type   | Required | Max Length | Description                               |
| --------- | ------ | -------- | ---------- | ----------------------------------------- |
| `query`   | string | Yes      | 4000       | The question or search query              |
| `context` | string | No       | 100        | Optional context hint to guide the search |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "knowstack.query",
    "arguments": {
      "query": "How do I configure tenant headers?",
      "context": "setup"
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
        "text": "To configure tenant headers, set the x-ks-org and x-ks-project headers in your MCP client configuration..."
      }
    ]
  }
}
```

---

### knowstack.get_documents

Get documents from the project. Supports: list all (paginated), get by ID, or search by keyword. Use `id` for specific document, `q` for search, or no args for listing.

**Parameters:**

| Parameter    | Type    | Required | Default | Min | Max | Pattern              | Description                                    |
| ------------ | ------- | -------- | ------- | --- | --- | -------------------- | ---------------------------------------------- |
| `id`         | string  | No       | -       | 1   | 255 | `^[a-zA-Z0-9_-]+$`  | Get a specific document by ID                  |
| `q`          | string  | No       | -       | 1   | 200 | -                    | Search documents by keyword                    |
| `page`       | integer | No       | 1       | 1   | -   | -                    | Page number for pagination                     |
| `limit`      | integer | No       | 20      | 1   | 100 | -                    | Items per page                                 |
| `sourceType` | string  | No       | -       | -   | -   | -                    | Filter by source: `MANUAL` or `URL`             |

**Example Request (list all):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "knowstack.get_documents",
    "arguments": {
      "page": 1,
      "limit": 10
    }
  }
}
```

**Example Request (get by ID):**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "knowstack.get_documents",
    "arguments": {
      "id": "getting-started-guide"
    }
  }
}
```

**Example Request (search by keyword):**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "knowstack.get_documents",
    "arguments": {
      "q": "configuration",
      "limit": 5
    }
  }
}
```

**Example Response (list):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"data\":[{\"id\":\"doc-1\",\"title\":\"API Guide\",\"sourceType\":\"MANUAL\",\"createdAt\":\"2024-01-15T10:00:00Z\"}],\"pagination\":{\"total\":25,\"page\":1,\"limit\":10,\"totalPages\":3}}"
      }
    ]
  }
}
```

**Error Response (document not found):**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [{ "type": "text", "text": "Document not found" }],
    "isError": true
  }
}
```

---

### knowstack.save_documents

Save a document to the project. Creates a new document or updates existing one (deduplication by content hash). Returns the action taken (created, updated, or unchanged). Supports two modes: manual (provide content directly) and URL auto-fetch (provide only a URL).

**Modes:**

- **Manual mode** — Provide `title` and `content`. Optionally include `sourceUrl` as metadata and `sourceType` override.
- **URL auto-fetch mode** — Provide only `sourceUrl` (no `content`). The server fetches the page, extracts content and title automatically. Optionally provide `title` to override the extracted title.

**Parameters:**

| Parameter    | Type   | Required | Min Length | Max Length | Description                                 |
| ------------ | ------ | -------- | ---------- | ---------- | ------------------------------------------- |
| `title`      | string | Conditional | 1       | 500        | Document title. Required in manual mode, optional in URL mode (auto-extracted from page) |
| `content`    | string | Conditional | 1       | -          | Document content (markdown). Required in manual mode, omit for URL auto-fetch |
| `sourceType` | string | No       | -          | -          | Source type: `MANUAL` or `URL` (default: `MANUAL` in manual mode, `URL` in auto-fetch mode) |
| `sourceUrl`  | string | Conditional | -       | -          | Source URL. Required in URL mode, optional in manual mode (must be valid URL format) |

> At least one of `content` or `sourceUrl` must be provided.

**Example Request (Manual mode):**

```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "knowstack.save_documents",
    "arguments": {
      "title": "Getting Started Guide",
      "content": "# Getting Started\n\nWelcome to the project..."
    }
  }
}
```

**Example Request (URL auto-fetch mode):**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "knowstack.save_documents",
    "arguments": {
      "sourceUrl": "https://example.com/docs/getting-started"
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
        "text": "{\"id\":\"abc123\",\"title\":\"Getting Started Guide\",\"action\":\"created\"}"
      }
    ]
  }
}
```

---

### knowstack.delete_documents

Delete a document by ID. Permanently removes the document and invalidates related caches.

**Parameters:**

| Parameter | Type   | Required | Min Length | Max Length | Pattern              | Description         |
| --------- | ------ | -------- | ---------- | ---------- | -------------------- | ------------------- |
| `id`      | string | Yes      | 1          | 255        | `^[a-zA-Z0-9_-]+$`  | Document ID to delete |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "knowstack.delete_documents",
    "arguments": {
      "id": "getting-started-guide"
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
        "text": "{\"id\":\"getting-started-guide\",\"status\":\"deleted\"}"
      }
    ]
  }
}
```

---

### knowstack.get_agents

Get AI agent instructions for the project. Returns merged results (PUBLIC < ORGANIZATION < PRIVATE). Use `name` for full content, omit for lightweight listing.

**Parameters:**

| Parameter    | Type   | Required | Max Length | Description                                                                      |
| ------------ | ------ | -------- | ---------- | -------------------------------------------------------------------------------- |
| `name`       | string | No       | 100        | Filter by agent name (exact match). Returns full content when specified.         |
| `visibility` | string | No       | -          | Filter by tier: `PUBLIC`, `ORGANIZATION`, or `PRIVATE`. Omit for merged results. |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "knowstack.get_agents",
    "arguments": {}
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"name\":\"architect\",\"description\":\"System architect for Clean Architecture and DDD\"}]"
      }
    ]
  }
}
```

---

### knowstack.save_agents

Save an agent instruction. Creates a new agent or updates existing one by name. Supports two modes: manual (provide content directly) and URL auto-fetch (provide only a URL).

**Modes:**

- **Manual mode** — Provide `content` directly.
- **URL auto-fetch mode** — Provide only `sourceUrl` (no `content`). The server fetches the page and uses the fetched content.

**Parameters:**

| Parameter     | Type   | Required    | Min Length | Max Length | Description                                                                      |
| ------------- | ------ | ----------- | ---------- | ---------- | -------------------------------------------------------------------------------- |
| `name`        | string | Yes         | 1          | 100        | Instruction name                                                                 |
| `description` | string | Yes         | 1          | 500        | Short description                                                                |
| `content`     | string | Conditional | 1          | -          | Full markdown content. Required unless `sourceUrl` is provided                   |
| `metadata`    | object | No          | -          | -          | Optional metadata (key-value pairs)                                              |
| `visibility`  | string | No          | -          | -          | Tier: `PUBLIC`, `ORGANIZATION`, or `PRIVATE`. Omit for merged results.           |
| `sourceUrl`   | string | Conditional | -          | -          | Source URL to auto-fetch content from. Required unless `content` is provided (must be valid URL) |

> At least one of `content` or `sourceUrl` must be provided. When both are given, `content` takes precedence.

**Example Request (manual mode):**

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "knowstack.save_agents",
    "arguments": {
      "name": "architect",
      "description": "System architect for Clean Architecture and DDD",
      "content": "# Architect Agent\n\nYou are a system architect..."
    }
  }
}
```

**Example Request (URL auto-fetch mode):**

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "knowstack.save_agents",
    "arguments": {
      "name": "architect",
      "description": "System architect for Clean Architecture and DDD",
      "sourceUrl": "https://raw.githubusercontent.com/org/repo/main/agents/architect.md"
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"name\":\"architect\",\"type\":\"AGENT\",\"status\":\"created\"}"
      }
    ]
  }
}
```

---

### knowstack.delete_agents

Delete an agent instruction by name.

**Parameters:**

| Parameter | Type   | Required | Min Length | Max Length | Description              |
| --------- | ------ | -------- | ---------- | ---------- | ------------------------ |
| `name`    | string | Yes      | 1          | 100        | Instruction name to delete |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "knowstack.delete_agents",
    "arguments": {
      "name": "architect"
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"name\":\"architect\",\"status\":\"deleted\"}"
      }
    ]
  }
}
```

---

### knowstack.get_commands

Get command instructions for the project. Returns merged results (PUBLIC < ORGANIZATION < PRIVATE). Use `name` for full content, omit for lightweight listing.

**Parameters:**

| Parameter    | Type   | Required | Max Length | Description                                                                      |
| ------------ | ------ | -------- | ---------- | -------------------------------------------------------------------------------- |
| `name`       | string | No       | 100        | Filter by command name (exact match). Returns full content when specified.        |
| `visibility` | string | No       | -          | Filter by tier: `PUBLIC`, `ORGANIZATION`, or `PRIVATE`. Omit for merged results. |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "knowstack.get_commands",
    "arguments": {
      "name": "code-review"
    }
  }
}
```

---

### knowstack.save_commands

Save a command instruction. Creates a new command or updates existing one by name. Supports two modes: manual (provide content directly) and URL auto-fetch (provide only a URL).

**Modes:**

- **Manual mode** — Provide `content` directly.
- **URL auto-fetch mode** — Provide only `sourceUrl` (no `content`). The server fetches the page and uses the fetched content.

**Parameters:**

| Parameter     | Type   | Required    | Min Length | Max Length | Description                                                                      |
| ------------- | ------ | ----------- | ---------- | ---------- | -------------------------------------------------------------------------------- |
| `name`        | string | Yes         | 1          | 100        | Instruction name                                                                 |
| `description` | string | Yes         | 1          | 500        | Short description                                                                |
| `content`     | string | Conditional | 1          | -          | Full markdown content. Required unless `sourceUrl` is provided                   |
| `metadata`    | object | No          | -          | -          | Optional metadata (key-value pairs)                                              |
| `visibility`  | string | No          | -          | -          | Tier: `PUBLIC`, `ORGANIZATION`, or `PRIVATE`. Omit for merged results.           |
| `sourceUrl`   | string | Conditional | -          | -          | Source URL to auto-fetch content from. Required unless `content` is provided (must be valid URL) |

> At least one of `content` or `sourceUrl` must be provided. When both are given, `content` takes precedence.

**Example Request (manual mode):**

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "knowstack.save_commands",
    "arguments": {
      "name": "code-review",
      "description": "Code review checklist for PRs",
      "content": "# Code Review\n\nFollow these steps..."
    }
  }
}
```

**Example Request (URL auto-fetch mode):**

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "knowstack.save_commands",
    "arguments": {
      "name": "code-review",
      "description": "Code review checklist for PRs",
      "sourceUrl": "https://raw.githubusercontent.com/org/repo/main/commands/code-review.md"
    }
  }
}
```

---

### knowstack.delete_commands

Delete a command instruction by name.

**Parameters:**

| Parameter | Type   | Required | Min Length | Max Length | Description              |
| --------- | ------ | -------- | ---------- | ---------- | ------------------------ |
| `name`    | string | Yes      | 1          | 100        | Instruction name to delete |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "knowstack.delete_commands",
    "arguments": {
      "name": "code-review"
    }
  }
}
```

---

### knowstack.get_skills

Get skill instructions for the project. Returns merged results (PUBLIC < ORGANIZATION < PRIVATE). Use `name` for full content, omit for lightweight listing.

**Parameters:**

| Parameter    | Type   | Required | Max Length | Description                                                                      |
| ------------ | ------ | -------- | ---------- | -------------------------------------------------------------------------------- |
| `name`       | string | No       | 100        | Filter by skill name (exact match). Returns full content when specified.          |
| `visibility` | string | No       | -          | Filter by tier: `PUBLIC`, `ORGANIZATION`, or `PRIVATE`. Omit for merged results. |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "method": "tools/call",
  "params": {
    "name": "knowstack.get_skills",
    "arguments": {
      "name": "backend-patterns"
    }
  }
}
```

---

### knowstack.save_skills

Save a skill instruction. Creates a new skill or updates existing one by name. Supports two modes: manual (provide content directly) and URL auto-fetch (provide only a URL).

**Modes:**

- **Manual mode** — Provide `content` directly.
- **URL auto-fetch mode** — Provide only `sourceUrl` (no `content`). The server fetches the page and uses the fetched content.

**Parameters:**

| Parameter     | Type   | Required    | Min Length | Max Length | Description                                                                      |
| ------------- | ------ | ----------- | ---------- | ---------- | -------------------------------------------------------------------------------- |
| `name`        | string | Yes         | 1          | 100        | Instruction name                                                                 |
| `description` | string | Yes         | 1          | 500        | Short description                                                                |
| `content`     | string | Conditional | 1          | -          | Full markdown content. Required unless `sourceUrl` is provided                   |
| `metadata`    | object | No          | -          | -          | Optional metadata (key-value pairs)                                              |
| `visibility`  | string | No          | -          | -          | Tier: `PUBLIC`, `ORGANIZATION`, or `PRIVATE`. Omit for merged results.           |
| `sourceUrl`   | string | Conditional | -          | -          | Source URL to auto-fetch content from. Required unless `content` is provided (must be valid URL) |

> At least one of `content` or `sourceUrl` must be provided. When both are given, `content` takes precedence.

**Example Request (manual mode):**

```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "method": "tools/call",
  "params": {
    "name": "knowstack.save_skills",
    "arguments": {
      "name": "testing-patterns",
      "description": "Testing patterns and conventions",
      "content": "# Testing Patterns\n\nUse vitest for all tests..."
    }
  }
}
```

**Example Request (URL auto-fetch mode):**

```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "method": "tools/call",
  "params": {
    "name": "knowstack.save_skills",
    "arguments": {
      "name": "testing-patterns",
      "description": "Testing patterns and conventions",
      "sourceUrl": "https://raw.githubusercontent.com/org/repo/main/skills/testing-patterns.md"
    }
  }
}
```

---

### knowstack.delete_skills

Delete a skill instruction by name.

**Parameters:**

| Parameter | Type   | Required | Min Length | Max Length | Description              |
| --------- | ------ | -------- | ---------- | ---------- | ------------------------ |
| `name`    | string | Yes      | 1          | 100        | Instruction name to delete |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 15,
  "method": "tools/call",
  "params": {
    "name": "knowstack.delete_skills",
    "arguments": {
      "name": "testing-patterns"
    }
  }
}
```

---

### knowstack.get_templates

Get template instructions for the project. Returns merged results (PUBLIC < ORGANIZATION < PRIVATE). Use `name` for full content, omit for lightweight listing.

**Parameters:**

| Parameter    | Type   | Required | Max Length | Description                                                                      |
| ------------ | ------ | -------- | ---------- | -------------------------------------------------------------------------------- |
| `name`       | string | No       | 100        | Filter by template name (exact match)                                            |
| `visibility` | string | No       | -          | Filter by tier: `PUBLIC`, `ORGANIZATION`, or `PRIVATE`. Omit for merged results. |

### knowstack.save_templates

Save a template instruction. Creates a new template or updates existing one by name. Supports two modes: manual (provide content directly) and URL auto-fetch (provide only a URL).

**Modes:**

- **Manual mode** — Provide `content` directly.
- **URL auto-fetch mode** — Provide only `sourceUrl` (no `content`). The server fetches the page and uses the fetched content.

**Parameters:**

| Parameter     | Type   | Required    | Max Length | Description            |
| ------------- | ------ | ----------- | ---------- | ---------------------- |
| `name`        | string | Yes         | 100        | Template name          |
| `description` | string | Yes         | 500        | Short description      |
| `content`     | string | Conditional | -          | Full markdown content. Required unless `sourceUrl` is provided  |
| `metadata`    | object | No          | -          | Optional metadata      |
| `visibility`  | string | No          | -          | `PUBLIC`, `ORGANIZATION`, or `PRIVATE` |
| `sourceUrl`   | string | Conditional | -          | Source URL to auto-fetch content from. Required unless `content` is provided (must be valid URL) |

> At least one of `content` or `sourceUrl` must be provided. When both are given, `content` takes precedence.

### knowstack.delete_templates

Delete a template instruction by name.

**Parameters:**

| Parameter | Type   | Required | Max Length | Description             |
| --------- | ------ | -------- | ---------- | ----------------------- |
| `name`    | string | Yes      | 100        | Template name to delete |

---

### knowstack.get_memory

Get memory entries for the project. Returns merged results (PUBLIC < ORGANIZATION < PRIVATE). Use `name` for full content, omit for lightweight listing.

**Parameters:**

| Parameter    | Type   | Required | Max Length | Description                                                                      |
| ------------ | ------ | -------- | ---------- | -------------------------------------------------------------------------------- |
| `name`       | string | No       | 100        | Filter by memory entry name (exact match)                                        |
| `visibility` | string | No       | -          | Filter by tier: `PUBLIC`, `ORGANIZATION`, or `PRIVATE`. Omit for merged results. |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 16,
  "method": "tools/call",
  "params": {
    "name": "knowstack.get_memory",
    "arguments": {}
  }
}
```

---

### knowstack.save_memory

Save a memory entry. Creates a new entry if the name doesn't exist, or updates the content if it does. Memory entries are PRIVATE to the project.

**Parameters:**

| Parameter | Type   | Required | Min Length | Max Length | Description                        |
| --------- | ------ | -------- | ---------- | ---------- | ---------------------------------- |
| `name`    | string | Yes      | 1          | 100        | Name of the memory entry           |
| `content` | string | Yes      | 1          | -          | Markdown content for the entry     |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 17,
  "method": "tools/call",
  "params": {
    "name": "knowstack.save_memory",
    "arguments": {
      "name": "project-conventions",
      "content": "# Project Conventions\n\n- Use pnpm, not npm\n- All imports use @/ aliases"
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 17,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"name\":\"project-conventions\",\"content\":\"# Project Conventions\\n\\n- Use pnpm, not npm\\n- All imports use @/ aliases\",\"status\":\"created\"}"
      }
    ]
  }
}
```

---

### knowstack.update_memory

Update a memory entry using str_replace semantics. Finds the `old_str` in the entry's content and replaces it with `new_str`. The `old_str` must match exactly once for safe replacement.

**Parameters:**

| Parameter | Type   | Required | Min Length | Max Length | Description                                          |
| --------- | ------ | -------- | ---------- | ---------- | ---------------------------------------------------- |
| `name`    | string | Yes      | 1          | 100        | Name of the memory entry to update                   |
| `old_str` | string | Yes      | 1          | -          | Text to find in the content (must match exactly once) |
| `new_str` | string | Yes      | -          | -          | Replacement text                                     |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 18,
  "method": "tools/call",
  "params": {
    "name": "knowstack.update_memory",
    "arguments": {
      "name": "project-conventions",
      "old_str": "Use pnpm, not npm",
      "new_str": "Use pnpm (never npm or yarn)"
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 18,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"name\":\"project-conventions\",\"content\":\"# Project Conventions\\n\\n- Use pnpm (never npm or yarn)\\n- All imports use @/ aliases\",\"status\":\"updated\"}"
      }
    ]
  }
}
```

---

### knowstack.delete_memory

Delete a memory entry by name. Permanently removes the entry from the project.

**Parameters:**

| Parameter | Type   | Required | Min Length | Max Length | Description                        |
| --------- | ------ | -------- | ---------- | ---------- | ---------------------------------- |
| `name`    | string | Yes      | 1          | 100        | Name of the memory entry to delete |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 19,
  "method": "tools/call",
  "params": {
    "name": "knowstack.delete_memory",
    "arguments": {
      "name": "project-conventions"
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 19,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"name\":\"project-conventions\",\"status\":\"deleted\"}"
      }
    ]
  }
}
```

---

### knowstack.search_instructions

Search instructions using hybrid search (vector similarity + keyword matching). Returns lightweight results (name, type, visibility, description, score) without full content. Use for discovery, then fetch full content with the type-specific tool by exact name.

When embeddings are available, results are ranked using a weighted combination: 70% semantic similarity + 30% keyword matching. Falls back to keyword-only when embeddings are unavailable.

**Parameters:**

| Parameter    | Type    | Required | Default | Min | Max | Description                                                                      |
| ------------ | ------- | -------- | ------- | --- | --- | -------------------------------------------------------------------------------- |
| `q`          | string  | Yes      | -       | 1   | 200 | Keyword search query                                                             |
| `type`       | string  | No       | -       | -   | -   | Filter by type: `AGENT`, `COMMAND`, `MEMORY`, `SKILL`, `TEMPLATE`                |
| `limit`      | integer | No       | 10      | 1   | 50  | Maximum results to return                                                        |
| `visibility` | string  | No       | -       | -   | -   | Filter by tier: `PUBLIC`, `ORGANIZATION`, or `PRIVATE`. Omit for merged results. |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 20,
  "method": "tools/call",
  "params": {
    "name": "knowstack.search_instructions",
    "arguments": {
      "q": "architect",
      "visibility": "ORGANIZATION",
      "limit": 5
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 20,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"results\":[{\"name\":\"architect\",\"type\":\"AGENT\",\"visibility\":\"ORGANIZATION\",\"description\":\"System architect for Clean Architecture and DDD\",\"score\":0.5}],\"total\":1,\"query\":\"architect\"}"
      }
    ]
  }
}
```

**Two-step pattern:**

1. Search for instructions: `search_instructions({q: "architect"})` — returns lightweight matches
2. Fetch full content: `get_agents({name: "architect"})` — returns full markdown content

---

### knowstack.backfill_instructions

Backfill embeddings for instructions. Generates vector embeddings for instructions that are missing or have stale embeddings. Supports dry-run for cost estimation.

**Parameters:**

| Parameter | Type    | Required | Default | Description                                                      |
| --------- | ------- | -------- | ------- | ---------------------------------------------------------------- |
| `type`    | string  | No       | -       | Filter by type: `AGENT`, `COMMAND`, `MEMORY`, `SKILL`, `TEMPLATE` |
| `force`   | boolean | No       | false   | Force regenerate all embeddings (not just missing/stale)          |
| `dryRun`  | boolean | No       | false   | Estimate cost without generating embeddings                      |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 21,
  "method": "tools/call",
  "params": {
    "name": "knowstack.backfill_instructions",
    "arguments": {
      "dryRun": true
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 21,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"total\":15,\"embedded\":0,\"skipped\":0,\"failed\":0,\"estimatedCostUsd\":0.00009,\"durationMs\":45}"
      }
    ]
  }
}
```

---

### knowstack.backfill_embeddings

Backfill embeddings for documents. Generates vector embeddings for documents that are missing or have stale embeddings. Supports dry-run for cost estimation.

**Parameters:**

| Parameter | Type    | Required | Default | Description                                                      |
| --------- | ------- | -------- | ------- | ---------------------------------------------------------------- |
| `force`   | boolean | No       | false   | Force regenerate all embeddings (not just missing/stale)          |
| `dryRun`  | boolean | No       | false   | Estimate cost without generating embeddings                      |

**Example Request:**

```json
{
  "jsonrpc": "2.0",
  "id": 22,
  "method": "tools/call",
  "params": {
    "name": "knowstack.backfill_embeddings",
    "arguments": {
      "dryRun": true
    }
  }
}
```

**Example Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 22,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"total\":10,\"embedded\":0,\"skipped\":0,\"failed\":0,\"estimatedCostUsd\":0.00005,\"durationMs\":30}"
      }
    ]
  }
}
```

---

## JSON-RPC Specification

All requests and responses follow the JSON-RPC 2.0 specification.

### Request Format

```json
{
  "jsonrpc": "2.0",
  "id": "<number or string>",
  "method": "<string>",
  "params": "<object>"
}
```

### Response Format (Success)

```json
{
  "jsonrpc": "2.0",
  "id": "<number or string>",
  "result": "<any>"
}
```

### Response Format (Tool Error)

Tool errors are returned as successful JSON-RPC responses with an `isError: true` flag:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{ "type": "text", "text": "Error message" }],
    "isError": true
  }
}
```

### Response Format (Protocol Error)

Protocol-level errors (e.g., invalid JSON, unknown method) return standard JSON-RPC error responses:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "error": {
    "code": -32603,
    "message": "Internal server error"
  }
}
```

---

## Error Handling

Tool errors are returned within a successful JSON-RPC response with the `isError: true` flag.

Common error scenarios:

| Scenario             | Status Code         | Response        | Details                                       |
| -------------------- | ------------------- | --------------- | --------------------------------------------- |
| Document not found   | 200 OK (tool error) | `isError: true` | Document ID does not exist in project         |
| Invalid parameters   | 200 OK (tool error) | `isError: true` | Tool parameter validation failed              |
| Service error        | 200 OK (tool error) | `isError: true` | Query orchestrator or document service failed |
| Missing tenant header| 400                 | HTTP error      | No `x-ks-org` or `x-ks-project` header       |
| Missing request body | 400                 | HTTP error      | POST body is empty or not JSON                |
| Invalid JSON-RPC     | 400                 | HTTP error      | JSON-RPC request malformed                    |

All errors include descriptive messages. Do not expose internal error details to the client.

---

## Client Configuration

### CLI Tools (Claude Code, Gemini CLI, etc.)

```bash
# Example: Claude Code
claude mcp add knowstack \
  --transport http http://localhost:3000/api/v1/mcp \
  -H "x-ks-org: your-org-slug" \
  -H "x-ks-project: your-project-slug"
```

Refer to your CLI tool's documentation for the exact `mcp add` syntax.

### IDE Extensions (VS Code, Cursor, Windsurf, etc.)

Most IDEs support MCP via a `.vscode/mcp.json` or similar config file:

```json
{
  "servers": {
    "knowstack": {
      "type": "http",
      "url": "http://localhost:3000/api/v1/mcp",
      "headers": {
        "x-ks-org": "your-org-slug",
        "x-ks-project": "your-project-slug"
      }
    }
  }
}
```

### Desktop Apps (Claude Desktop, etc.)

Desktop MCP clients typically use a JSON config file. Refer to your app's documentation for the config file location.

```json
{
  "mcpServers": {
    "knowstack": {
      "type": "http",
      "url": "http://localhost:3000/api/v1/mcp",
      "headers": {
        "x-ks-org": "your-org-slug",
        "x-ks-project": "your-project-slug"
      }
    }
  }
}
```

---

## See Also

- [API Reference](index.md) - Endpoint overview
- [Common Headers](../integrations/common-headers.md) - Request/response headers
- [Error Handling](../troubleshooting/errors.md) - Error codes and handling
