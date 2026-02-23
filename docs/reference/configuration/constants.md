[Home](../../index.md) > [Reference](../index.md) > [Configuration](index.md) > **Constants**

# Constants Reference

Static configuration values used throughout the application.

## Organization

Constants are organized by scope:

| Scope | Location | Purpose |
|-------|----------|---------|
| Shared | `@/app.constants` | Cross-cutting values used by multiple modules |
| Audit | `@/application/audit/audit.constants` | Audit enums, rate limits, pagination, export |
| Instructions | `@/application/instructions/instructions.constants` | Instruction defaults |
| MCP | `@/application/mcp/mcp.constants` | MCP tool names, descriptions |
| Security | `@/application/security/security.constants` | Security headers |
| Ingestion | `@/application/ingestion/ingestion.constants` | Source types |
| Documents | `@/application/documents/documents.constants` | Document defaults, pagination |
| Embedding | `@/application/embedding/embedding.constants` | Embedding config, search types |
| Request Context | `@/common/constants/request-context.constants` | Request ID validation |

## Shared Constants (`@/app.constants`)

### Application Metadata

| Constant | Value | Description |
|----------|-------|-------------|
| `APP_NAME` | `'KnowStack'` | Application name |
| `APP_VERSION` | `'1.0.0'` | Current version |
| `USER_AGENT` | `'KnowStack/1.0.0'` | Outbound HTTP User-Agent |

### Time Conversions

| Constant | Value | Description |
|----------|-------|-------------|
| `SECONDS_PER_MINUTE` | `60` | Seconds in a minute |
| `SECONDS_PER_HOUR` | `3600` | Seconds in an hour |
| `SECONDS_PER_DAY` | `86400` | Seconds in a day |
| `MS_PER_SECOND` | `1000` | Milliseconds in a second |

### HTTP Defaults

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_FETCH_TIMEOUT_MS` | `10000` | Fetch timeout (10s) |
| `MAX_CONTENT_SIZE_BYTES` | `1048576` | Max content size (1MB) |

## Module Constants

### Audit (`@/application/audit/audit.constants`)

#### Enums

**`AuditCategory`** -- Event category:

| Enum Value | String | Description |
|------------|--------|-------------|
| `AuditCategory.DOCUMENT` | `'DOCUMENT'` | Document operations |
| `AuditCategory.ADMIN` | `'ADMIN'` | Administrative actions |
| `AuditCategory.AUDIT` | `'AUDIT'` | Audit-of-audit (access tracking) |

**`ResourceType`** -- Target resource:

| Enum Value | String | Description |
|------------|--------|-------------|
| `ResourceType.ORGANIZATION` | `'Organization'` | Organization resource |
| `ResourceType.PROJECT` | `'Project'` | Project resource |
| `ResourceType.DOCUMENT` | `'Document'` | Document resource |
| `ResourceType.AUDIT_LOG` | `'AuditLog'` | Audit log resource |

#### Rate Limits

| Constant | Value | Description |
|----------|-------|-------------|
| `RATE_LIMIT_TTL_MS` | `60000` | Rate limit window (1 minute) |

#### Pagination

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_PAGE` | `1` | Default page number |
| `DEFAULT_LIMIT` | `50` | Default page size |
| `MAX_LIMIT` | `100` | Maximum page size |

### Instructions (`@/application/instructions/instructions.constants`)

| Constant | Value | Description |
|----------|-------|-------------|
| `INSTRUCTION_DEFAULTS.LIST_PAGE_SIZE` | `20` | Default page size |
| `INSTRUCTION_DEFAULTS.LIST_MAX_PAGE_SIZE` | `100` | Maximum page size |
| `INSTRUCTION_DEFAULTS.NAME_MAX_LENGTH` | `100` | Max instruction name length |
| `INSTRUCTION_DEFAULTS.DESCRIPTION_MAX_LENGTH` | `500` | Max description length |
| `INSTRUCTION_TYPES` | `['AGENT', 'COMMAND', 'MEMORY', 'SKILL', 'TEMPLATE']` | Valid instruction types |
| `INSTRUCTION_VISIBILITIES` | `['PUBLIC', 'ORGANIZATION', 'PRIVATE']` | Valid visibility values |
| `INSTRUCTION_DEFAULTS.SEARCH_DEFAULT_LIMIT` | `10` | Default search results |
| `INSTRUCTION_DEFAULTS.SEARCH_MAX_LIMIT` | `50` | Maximum search results |
| `INSTRUCTION_DEFAULTS.SEARCH_QUERY_MAX_LENGTH` | `200` | Maximum search query length |
| `INSTRUCTION_API_VISIBILITIES` | `['ORGANIZATION', 'PRIVATE']` | API-writable visibilities |
| `INSTRUCTION_SEARCH_WEIGHTS` | `{ NAME: 0.5, DESCRIPTION: 0.3, CONTENT: 0.2 }` | Search relevance weights |
| `MEMORY_DEFAULT_DESCRIPTION` | `'AI-managed memory entry'` | Default description for MCP-created memory |

### MCP (`@/application/mcp/mcp.constants`)

| Constant | Value | Description |
|----------|-------|-------------|
| `MCP_SERVER_NAME` | `'knowstack'` | MCP server name |
| `MCP_SERVER_VERSION` | `APP_VERSION` | MCP server version |
| `MCP_TOOL_QUERY` | `'knowstack.query'` | Query tool name |
| `MCP_TOOL_GET_DOCUMENTS` | `'knowstack.get_documents'` | Get/list/search docs tool name |
| `MCP_TOOL_SAVE_DOCUMENTS` | `'knowstack.save_documents'` | Save document tool name |
| `MCP_TOOL_DELETE_DOCUMENTS` | `'knowstack.delete_documents'` | Delete document tool name |
| `MCP_TOOL_GET_AGENTS` | `'knowstack.get_agents'` | Get agents tool name |
| `MCP_TOOL_SAVE_AGENTS` | `'knowstack.save_agents'` | Save agent tool name |
| `MCP_TOOL_DELETE_AGENTS` | `'knowstack.delete_agents'` | Delete agent tool name |
| `MCP_TOOL_GET_COMMANDS` | `'knowstack.get_commands'` | Get commands tool name |
| `MCP_TOOL_SAVE_COMMANDS` | `'knowstack.save_commands'` | Save command tool name |
| `MCP_TOOL_DELETE_COMMANDS` | `'knowstack.delete_commands'` | Delete command tool name |
| `MCP_TOOL_GET_SKILLS` | `'knowstack.get_skills'` | Get skills tool name |
| `MCP_TOOL_SAVE_SKILLS` | `'knowstack.save_skills'` | Save skill tool name |
| `MCP_TOOL_DELETE_SKILLS` | `'knowstack.delete_skills'` | Delete skill tool name |
| `MCP_TOOL_GET_TEMPLATES` | `'knowstack.get_templates'` | Get templates tool name |
| `MCP_TOOL_SAVE_TEMPLATES` | `'knowstack.save_templates'` | Save template tool name |
| `MCP_TOOL_DELETE_TEMPLATES` | `'knowstack.delete_templates'` | Delete template tool name |
| `MCP_TOOL_GET_MEMORY` | `'knowstack.get_memory'` | Get memory tool name |
| `MCP_TOOL_SAVE_MEMORY` | `'knowstack.save_memory'` | Save memory tool name |
| `MCP_TOOL_UPDATE_MEMORY` | `'knowstack.update_memory'` | Update memory tool name |
| `MCP_TOOL_DELETE_MEMORY` | `'knowstack.delete_memory'` | Delete memory tool name |
| `MCP_TOOL_SEARCH_INSTRUCTIONS` | `'knowstack.search_instructions'` | Search instructions tool name |
| `MCP_TOOL_BACKFILL_INSTRUCTIONS` | `'knowstack.backfill_instructions'` | Backfill instruction embeddings tool name |

### Security (`@/application/security/security.constants`)

| Constant | Value | Description |
|----------|-------|-------------|
| `SECURITY_HEADERS.DATA_PRIVACY` | `'X-Data-Privacy'` | Data privacy header |
| `SECURITY_HEADERS.CONTENT_TYPE_OPTIONS` | `'X-Content-Type-Options'` | Content type options header |
| `SECURITY_HEADERS.FRAME_OPTIONS` | `'X-Frame-Options'` | Frame options header |
| `SECURITY_HEADERS.STRICT_TRANSPORT_SECURITY` | `'Strict-Transport-Security'` | HSTS header |
| `TLS_PROTOCOL` | `'TLS 1.2+'` | TLS protocol version |

### Documents (`@/application/documents/documents.constants`)

| Constant | Value | Description |
|----------|-------|-------------|
| `DOCUMENT_DEFAULTS.CONTENT_PREVIEW_LENGTH` | `200` | Content preview character limit |
| `DOCUMENT_DEFAULTS.CONTENT_PREVIEW_SUFFIX` | `'...'` | Preview truncation suffix |
| `DOCUMENT_DEFAULTS.LIST_PAGE_SIZE` | `20` | Default page size |
| `DOCUMENT_DEFAULTS.LIST_MAX_PAGE_SIZE` | `100` | Maximum page size |
| `DOCUMENT_DEFAULTS.SEARCH_DEFAULT_LIMIT` | `10` | Default search results |
| `DOCUMENT_DEFAULTS.SEARCH_MAX_LIMIT` | `50` | Maximum search results |
| `DOCUMENT_DEFAULTS.SEARCH_QUERY_MAX_LENGTH` | `200` | Maximum search query length |

### Ingestion (`@/application/ingestion/ingestion.constants`)

| Constant | Value | Description |
|----------|-------|-------------|
| `SOURCE_TYPES.MANUAL` | `'MANUAL'` | Manual content submission |
| `SOURCE_TYPES.URL` | `'URL'` | URL-based content source |

### Embedding (`@/application/embedding/embedding.constants`)

| Constant | Value | Description |
|----------|-------|-------------|
| `EMBEDDING_DEFAULTS.TOP_K` | `10` | Default top-K for search |
| `EMBEDDING_DEFAULTS.MAX_TOP_K` | `50` | Maximum top-K |
| `EMBEDDING_DEFAULTS.HYBRID_WEIGHT` | `0.7` | Default semantic weight |
| `EMBEDDING_DEFAULTS.RATE_LIMIT_PER_MINUTE` | `60` | Rate limit |
| `EMBEDDING_DEFAULTS.MAX_BATCH_SIZE` | `100` | Max backfill batch size |
| `OPENAI_EMBEDDING.MODEL` | `'text-embedding-3-small'` | OpenAI model |
| `OPENAI_EMBEDDING.DIMENSIONS` | `1536` | Vector dimensions |
| `INSTRUCTION_BACKFILL_DEFAULTS.AVG_TOKENS_PER_INSTRUCTION` | `300` | Estimated tokens per instruction |
| `INSTRUCTION_BACKFILL_DEFAULTS.MAX_PAGINATION_LIMIT` | `1000` | Max instructions to fetch for backfill |
| `EMBEDDING_OPERATIONS.INSTRUCTION_EMBEDDING` | `'instruction_embedding'` | Operation name for tracking |

### Request Context (`@/common/constants/request-context.constants`)

| Constant | Value | Description |
|----------|-------|-------------|
| `MAX_REQUEST_ID_LENGTH` | `64` | Maximum request ID length |
| `UUID_V4_PATTERN` | `/^[0-9a-f]{8}-..$/i` | UUID v4 validation regex |

## Usage

```typescript
// Shared constants
import { USER_AGENT, SECONDS_PER_DAY } from '@/app.constants';

// Module constants
import { MCP_SERVER_NAME } from '@/application/mcp/mcp.constants';
```

## See Also

- [Settings Reference](settings.md) - Environment-configurable values
- [Architecture Patterns](../../explanation/architecture/patterns.md) - Constants organization rationale
