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
| `AuditCategory.INSTRUCTION` | `'INSTRUCTION'` | Instruction operations |
| `AuditCategory.QUERY` | `'QUERY'` | Query operations |

**`ResourceType`** -- Target resource:

| Enum Value | String | Description |
|------------|--------|-------------|
| `ResourceType.ORGANIZATION` | `'Organization'` | Organization resource |
| `ResourceType.PROJECT` | `'Project'` | Project resource |
| `ResourceType.DOCUMENT` | `'Document'` | Document resource |
| `ResourceType.AUDIT_LOG` | `'AuditLog'` | Audit log resource |
| `ResourceType.INSTRUCTION` | `'Instruction'` | Instruction resource |
| `ResourceType.QUERY` | `'Query'` | Query resource |

**`AuditAction`** -- Event action:

| Enum Value | String | Category |
|------------|--------|----------|
| `AuditAction.DOCUMENT_CREATED` | `'DOCUMENT_CREATED'` | DOCUMENT |
| `AuditAction.DOCUMENT_UPDATED` | `'DOCUMENT_UPDATED'` | DOCUMENT |
| `AuditAction.DOCUMENT_DELETED` | `'DOCUMENT_DELETED'` | DOCUMENT |
| `AuditAction.ORG_CREATED` | `'ORG_CREATED'` | ADMIN |
| `AuditAction.ORG_UPDATED` | `'ORG_UPDATED'` | ADMIN |
| `AuditAction.ORG_DELETED` | `'ORG_DELETED'` | ADMIN |
| `AuditAction.PROJECT_CREATED` | `'PROJECT_CREATED'` | ADMIN |
| `AuditAction.PROJECT_UPDATED` | `'PROJECT_UPDATED'` | ADMIN |
| `AuditAction.PROJECT_DELETED` | `'PROJECT_DELETED'` | ADMIN |
| `AuditAction.AUDIT_LOG_QUERIED` | `'AUDIT_LOG_QUERIED'` | AUDIT |
| `AuditAction.AUDIT_LOG_EXPORTED` | `'AUDIT_LOG_EXPORTED'` | AUDIT |
| `AuditAction.INSTRUCTION_CREATED` | `'INSTRUCTION_CREATED'` | INSTRUCTION |
| `AuditAction.INSTRUCTION_UPDATED` | `'INSTRUCTION_UPDATED'` | INSTRUCTION |
| `AuditAction.INSTRUCTION_DELETED` | `'INSTRUCTION_DELETED'` | INSTRUCTION |
| `AuditAction.QUERY_EXECUTED` | `'QUERY_EXECUTED'` | QUERY |
| `AuditAction.SEARCH_EXECUTED` | `'SEARCH_EXECUTED'` | QUERY |

#### Rate Limits

| Constant | Value | Description |
|----------|-------|-------------|
| `RATE_LIMIT_TTL_MS` | `60000` | Rate limit window (1 minute) |
| `RATE_LIMIT_ADMIN_QUERY` | `30` | Admin query requests per minute |
| `RATE_LIMIT_USER_QUERY` | `10` | User query requests per minute |
| `RATE_LIMIT_EXPORT` | `5` | Export requests per minute |

#### Pagination

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_PAGE` | `1` | Default page number |
| `DEFAULT_LIMIT` | `50` | Default page size |
| `MAX_LIMIT` | `100` | Maximum page size |
| `MAX_EXPORT_RANGE_DAYS` | `90` | Maximum export date range |
| `MS_PER_DAY` | `86400000` | Milliseconds per day |
| `EXPORT_BATCH_SIZE` | `500` | Export batch size |

#### Metadata Sanitization

**`SENSITIVE_METADATA_KEYS`** -- Keys stripped from audit log metadata before persistence. Contains 27+ patterns including: `password`, `token`, `secret`, `apikey`, `api_key`, `authorization`, `bearer`, `jwt`, `credential`, `connection_string`, `database_url`, etc.

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
| `MCP_TOOL_BACKFILL_EMBEDDINGS` | `'knowstack.backfill_embeddings'` | Backfill document embeddings tool name |

### Security (`@/application/security/security.constants`)

#### Headers

| Constant | Value | Description |
|----------|-------|-------------|
| `SECURITY_HEADERS.DATA_PRIVACY` | `'X-Data-Privacy'` | Data privacy header |
| `SECURITY_HEADERS.ENCRYPTION_STATUS` | `'X-Encryption-Status'` | Encryption status header |
| `SECURITY_HEADERS.CONTENT_TYPE_OPTIONS` | `'X-Content-Type-Options'` | Content type options header |
| `SECURITY_HEADERS.FRAME_OPTIONS` | `'X-Frame-Options'` | Frame options header |
| `SECURITY_HEADERS.STRICT_TRANSPORT_SECURITY` | `'Strict-Transport-Security'` | HSTS header |

**`SECURITY_HEADER_VALUES`** -- Default values for security headers:

| Constant | Value | Description |
|----------|-------|-------------|
| `SECURITY_HEADER_VALUES.DATA_PRIVACY` | `'no-ai-training'` | Data privacy header value |
| `SECURITY_HEADER_VALUES.CONTENT_TYPE_OPTIONS` | `'nosniff'` | Content type options value |
| `SECURITY_HEADER_VALUES.FRAME_OPTIONS` | `'DENY'` | Frame options value |
| `SECURITY_HEADER_VALUES.HSTS` | `'max-age=31536000; includeSubDomains'` | HSTS value |

#### Encryption

| Constant | Value | Description |
|----------|-------|-------------|
| `ENCRYPTION_ALGORITHM` | `'aes-256-gcm'` | Encryption algorithm |
| `ENCRYPTION_KEY_SIZE_BITS` | `256` | Key size in bits |
| `ENCRYPTION_IV_LENGTH` | `12` | Initialization vector length |
| `ENCRYPTION_AUTH_TAG_LENGTH` | `16` | Authentication tag length |
| `ENCRYPTION_KEY_BYTES` | `32` | Key size in bytes |
| `ENCRYPTION_KEY_HEX_LENGTH` | `64` | Hex-encoded key length |

**`ENCRYPTION_CONFIG_KEYS`** -- Config key paths:

| Constant | Value | Description |
|----------|-------|-------------|
| `ENCRYPTION_CONFIG_KEYS.KEY` | `'encryption.key'` | Encryption key config path |
| `ENCRYPTION_CONFIG_KEYS.ALGORITHM` | `'encryption.algorithm'` | Encryption algorithm config path |

#### TLS & Retention

| Constant | Value | Description |
|----------|-------|-------------|
| `TLS_PROTOCOL` | `'TLS 1.2+'` | TLS protocol version |
| `TLS_NOTE` | `'Actual TLS version depends on client capabilities'` | TLS version caveat |
| `SESSION_RETENTION` | `'7 days after expiration'` | Session data retention policy |
| `DOCUMENT_RETENTION` | `'Until deleted by user'` | Document data retention policy |

#### AI Provider Policy

| Constant | Value | Description |
|----------|-------|-------------|
| `OPENAI_PROVIDER_POLICY.NAME` | `'OpenAI'` | Provider name |
| `OPENAI_PROVIDER_POLICY.DATA_RETENTION` | `'30 days (OpenAI default unless opted into ZDR)'` | Data retention policy |
| `OPENAI_PROVIDER_POLICY.DOCUMENTATION_URL` | `'https://openai.com/policies/api-data-usage-policies'` | OpenAI data policy URL |
| `OPENAI_PROVIDER_POLICY.ZDR_NOTE` | `'Requires OpenAI organization opt-in (see OpenAI docs)'` | Zero data retention note |

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

**`DOCUMENT_SCORING`** -- Keyword search scoring weights:

| Constant | Value | Description |
|----------|-------|-------------|
| `DOCUMENT_SCORING.TITLE_WEIGHT` | `0.6` | Title match weight |
| `DOCUMENT_SCORING.CONTENT_WEIGHT` | `0.4` | Content match weight |
| `DOCUMENT_SCORING.TITLE_NORM_LENGTH` | `100` | Title normalization length |
| `DOCUMENT_SCORING.CONTENT_NORM_LENGTH` | `500` | Content normalization length |

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
| `EMBEDDING_DEFAULTS.MIN_TOP_K` | `1` | Minimum top-K |
| `EMBEDDING_DEFAULTS.HYBRID_WEIGHT` | `0.7` | Default semantic weight |
| `EMBEDDING_DEFAULTS.MIN_SCORE` | `0.35` | Minimum similarity score threshold |
| `EMBEDDING_DEFAULTS.SIMILARITY_FLOOR` | `0.3` | Similarity floor for filtering |
| `EMBEDDING_DEFAULTS.RATE_LIMIT_PER_MINUTE` | `60` | Rate limit |
| `EMBEDDING_DEFAULTS.MAX_BATCH_SIZE` | `100` | Max backfill batch size |
| `EMBEDDING_DEFAULTS.DEFAULT_BATCH_SIZE` | `50` | Default backfill batch size |
| `OPENAI_EMBEDDING.MODEL` | `'text-embedding-3-small'` | OpenAI model |
| `OPENAI_EMBEDDING.DIMENSIONS` | `1536` | Vector dimensions |
| `OPENAI_EMBEDDING.MAX_TOKENS` | `8191` | Max input tokens |
| `OPENAI_EMBEDDING.COST_PER_MILLION_TOKENS` | `0.02` | Cost per million tokens (USD) |
| `SEARCH_MATCH_TYPES.SEMANTIC` | `'semantic'` | Semantic search match type |
| `SEARCH_MATCH_TYPES.KEYWORD` | `'keyword'` | Keyword search match type |
| `SEARCH_MATCH_TYPES.HYBRID` | `'hybrid'` | Hybrid search match type |
| `RETRIEVAL_METHODS.HYBRID` | `'hybrid'` | Hybrid retrieval method |
| `RETRIEVAL_METHODS.ALL_DOCS` | `'all-docs'` | All-documents fallback method |
| `BACKFILL_DEFAULTS.AVG_TOKENS_PER_DOC` | `500` | Estimated tokens per document |
| `BACKFILL_DEFAULTS.MAX_PAGINATION_LIMIT` | `1000` | Max documents to fetch for backfill |
| `INSTRUCTION_BACKFILL_DEFAULTS.AVG_TOKENS_PER_INSTRUCTION` | `300` | Estimated tokens per instruction |
| `INSTRUCTION_BACKFILL_DEFAULTS.MAX_PAGINATION_LIMIT` | `1000` | Max instructions to fetch for backfill |
| `EMBEDDING_OPERATIONS.QUERY_EMBEDDING` | `'embedding'` | Query embedding operation |
| `EMBEDDING_OPERATIONS.DOCUMENT_EMBEDDING` | `'document_embedding'` | Document embedding operation |
| `EMBEDDING_OPERATIONS.INSTRUCTION_EMBEDDING` | `'instruction_embedding'` | Instruction embedding operation |
| `EMBEDDING_ERROR_CODES.EMBEDDING_API_ERROR` | `'EMBEDDING_API_ERROR'` | Embedding provider API failure |
| `EMBEDDING_ERROR_CODES.EMBEDDING_NOT_CONFIGURED` | `'EMBEDDING_NOT_CONFIGURED'` | Provider not configured |
| `EMBEDDING_ERROR_CODES.EMBEDDING_RATE_LIMITED` | `'EMBEDDING_RATE_LIMITED'` | Rate limit exceeded |
| `EMBEDDING_ERROR_CODES.EMBEDDING_TOKEN_LIMIT_EXCEEDED` | `'EMBEDDING_TOKEN_LIMIT_EXCEEDED'` | Token limit exceeded |
| `EMBEDDING_ERROR_CODES.EMBEDDING_DISABLED` | `'EMBEDDING_DISABLED'` | Embeddings disabled |
| `EMBEDDING_ERROR_CODES.VECTOR_SEARCH_FAILED` | `'VECTOR_SEARCH_FAILED'` | Vector search failure |
| `EMBEDDING_ERROR_CODES.PGVECTOR_NOT_INSTALLED` | `'PGVECTOR_NOT_INSTALLED'` | pgvector extension missing |

**`EMBEDDING_CLIENT_ERRORS`** -- User-facing error messages:

| Constant | Value | Description |
|----------|-------|-------------|
| `EMBEDDING_CLIENT_ERRORS.SEARCH_UNAVAILABLE` | `'SEARCH_UNAVAILABLE'` | Semantic search not available |
| `EMBEDDING_CLIENT_ERRORS.RATE_LIMITED` | `'RATE_LIMITED'` | Client rate limited |
| `EMBEDDING_CLIENT_ERRORS.PROCESSING_FAILED` | `'PROCESSING_FAILED'` | Embedding processing failed |

**`SEMANTIC_SEARCH_HEADERS`** -- Response headers for semantic search metadata:

| Constant | Value | Description |
|----------|-------|-------------|
| `SEMANTIC_SEARCH_HEADERS.SEMANTIC_SEARCH` | `'X-Semantic-Search'` | Whether semantic search was used |
| `SEMANTIC_SEARCH_HEADERS.SEMANTIC_DOCS` | `'X-Semantic-Search-Docs'` | Number of docs from semantic search |

#### Internal Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `DEFAULT_PROVIDER_NAME` | `'stub'` | Default embedding provider |
| `RETRIEVAL_META_CLS_KEY` | `'retrievalMeta'` | AsyncLocalStorage key for retrieval metadata |

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
