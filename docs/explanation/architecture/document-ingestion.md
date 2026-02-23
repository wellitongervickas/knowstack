[Home](../../index.md) > [Explanation](../index.md) > [Architecture](index.md) > **Document Ingestion**

# Document Ingestion

How documents are ingested into KnowStack.

## Overview

KnowStack supports ingesting documents from multiple sources:

- **MANUAL**: Direct content submission via MCP tools
- **URL**: Fetch content from any HTTP/HTTPS URL

## Ingestion Flow

```
Source (URL/Manual)
         │
         ▼
    ┌─────────────┐
    │   Fetcher   │  (UrlFetcher, optional)
    │  (optional) │
    └─────────────┘
         │
         ▼
┌─────────────────────┐
│ DocumentIngestion   │
│ Service             │
│  - Normalize        │
│  - Hash (SHA-256)   │
│  - Deduplicate      │
│  - Persist          │
└─────────────────────┘
         │
         ▼
    ┌─────────────┐
    │  Database   │
    │  (Prisma)   │
    └─────────────┘
```

## Source Types

### MANUAL

Direct content submission. Used by:

- MCP `knowstack.save_documents` tool (manual mode — `title` + `content` provided)
- Seed scripts

Documents with `sourceType: MANUAL` have no `sourceUrl`.

### URL

Fetches content from any HTTP/HTTPS URL. Can be triggered via:

- MCP `knowstack.save_documents` tool (URL auto-fetch mode — `sourceUrl` without `content`)
- Direct call to `DocumentIngestionService.ingestFromSource()`

**Features:**

- Validates protocol (http/https only)
- 10 second timeout via AbortController
- 1MB max content size
- Extracts title from H1 markdown or HTML title tag

**Rate Safety:**

- Content-Length header checked before reading
- Timeout prevents hanging on slow servers
- Errors logged but don't crash batch ingestion

## Content Deduplication

Every document is assigned a SHA-256 content hash based on normalized content.

**Normalization:**

1. Convert CRLF to LF
2. Trim leading/trailing whitespace

**Deduplication Logic:**

```typescript
// 1. Hash match → unchanged (skip)
existingByHash = findByContentHash(projectId, hash)
if (existingByHash) return { action: 'unchanged' }

// 2. URL match + different hash → update
existingByUrl = findBySourceUrl(projectId, sourceUrl)
if (existingByUrl) {
  update(existingByUrl.id, { content, contentHash })
  return { action: 'updated' }
}

// 3. No match → create
create({ projectId, content, contentHash, ... })
return { action: 'created' }
```

**Database Constraint:**

```prisma
@@unique([projectId, contentHash])
```

This ensures no duplicate content within a project.

## Database Schema

```prisma
model Document {
  id          String     @id
  projectId   String
  title       String
  content     String     @db.Text
  sourceType  SourceType // MANUAL | URL
  sourceUrl   String?
  contentHash String     // SHA-256
  metadata    Json       // Extensible metadata
  createdAt   DateTime
  updatedAt   DateTime

  @@unique([projectId, contentHash])
  @@index([projectId])
  @@index([contentHash])
  @@index([sourceUrl])
}
```

## Service Architecture

```
Application Layer:
├── McpToolHandlerService
│   └── handleSaveDocuments() → Routes to ingest() or ingestFromSource() based on input
├── DocumentIngestionService
│   ├── ingest(input)         → Normalize, hash, dedupe, persist, trigger embedding
│   ├── ingestFromSource()    → Fetch + ingest (supports title override)
│   └── ingestBatch()         → Multiple documents (continues on failure)
├── DocumentEmbeddingService  → Generate and store vector embeddings (fire-and-forget)

Infrastructure Layer:
├── UrlFetcher                → Fetch from any URL
└── DocumentRepository        → Database operations
```

## Embedding Integration

Document ingestion triggers embedding generation automatically:

1. On document **create** or **update**, `DocumentIngestionService` fires `triggerEmbedding()` (fire-and-forget)
2. `DocumentEmbeddingService` generates vector embeddings via the configured provider
3. **contentHash** is used for skip logic — unchanged content is not re-embedded

This is a fire-and-forget side-effect: embedding failures do not fail the ingestion response.

## Retrieval Behavior

Queries use hybrid retrieval when embeddings are enabled:

- **Semantic search** via pgvector cosine similarity
- **Keyword search** as fallback
- Configurable weight between the two (`EMBEDDING_HYBRID_WEIGHT`)

When embeddings are disabled, all project documents are returned (all-docs retrieval).

## See Also

- [Architecture Overview](overview.md)
- [Patterns](patterns.md)
- [Observability](observability.md)
