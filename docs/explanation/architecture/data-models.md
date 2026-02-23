[Home](../../index.md) > [Explanation](../index.md) > [Architecture](index.md) > **Data Models**

# Data Models

Entity schemas and relationships in KnowStack.

## Business Model

How product concepts map to data entities:

```
Organization (tenant)
│
├── Documentation Spaces (Projects)
│   ├── "Backend API" project
│   ├── "Frontend Components" project
│   └── "Design System" project
│         │
│         ├── Documents (content to query)
│         │   sources: manual, GitHub, URL
│         │
│         ├── Document Embeddings (optional, 1:1)
│         │   vector representations for semantic search
│         │
│         ├── Instruction Embeddings (optional, 1:1)
│         │   vector representations for instruction search
│         │
│         └── Instructions (AI configuration)
│             types: AGENT, COMMAND, MEMORY, SKILL, TEMPLATE
│
└── Audit Logs (immutable trail)
    operational event records
```

**Key concepts:**

| Product Term        | Data Entity       | Description                                |
| ------------------- | ----------------- | ------------------------------------------ |
| Organization        | Organization      | Top-level tenant                           |
| Documentation Space | Project           | Isolated docs domain (e.g., "Backend API") |
| Document            | Document          | Queryable content piece                    |
| Document Embedding  | DocumentEmbedding      | Vector for document semantic search        |
| Instruction Embedding | InstructionEmbedding | Vector for instruction semantic search     |
| Instruction         | Instruction       | AI agent/command/skill/memory config       |
| Audit Log           | AuditLog          | Immutable event record                     |

---

## Entity Relationship Diagram

```
Organization (tenant)
  │
  ├── Project
  │   ├── Document
  │   │   (MANUAL/URL)
  │   │   └── DocumentEmbedding (optional, 1:1)
  │   └── Instruction (PRIVATE visibility)
  │       └── InstructionEmbedding (optional, 1:1)
  │
  ├── Instruction (ORGANIZATION/PUBLIC visibility)
  │   └── InstructionEmbedding (optional, 1:1)
  │
  └── AuditLog (immutable trail)
```

---

## Core Entities

### Organization

Top-level tenant container.

| Field               | Type          | Description                                 |
| ------------------- | ------------- | ------------------------------------------- |
| `id`                | string (CUID) | Primary key                                 |
| `name`              | string        | Display name                                |
| `slug`              | string        | Unique URL-safe identifier                  |
| `createdAt`         | DateTime      | Creation date                               |
| `updatedAt`         | DateTime      | Last update                                 |

**Constraints:**

- `slug` is unique across all organizations

**Relationships:**

- Has many `Project` (1:N)
- Has many `Instruction` where visibility is ORGANIZATION or PUBLIC (1:N)

---

### Project

Documentation space within an organization.

| Field            | Type          | Description         |
| ---------------- | ------------- | ------------------- |
| `id`             | string (CUID) | Primary key         |
| `organizationId` | string        | FK to Organization  |
| `name`           | string        | Display name        |
| `slug`           | string        | URL-safe identifier |
| `createdAt`      | DateTime      | Creation date       |
| `updatedAt`      | DateTime      | Last update         |

**Constraints:**

- Unique on `[organizationId, slug]`

---

### Document

Knowledge content for queries.

| Field         | Type          | Description                           |
| ------------- | ------------- | ------------------------------------- |
| `id`          | string (CUID) | Primary key                           |
| `projectId`   | string        | FK to Project                         |
| `title`       | string        | Document title                        |
| `content`     | text          | Document content                      |
| `sourceType`  | enum          | MANUAL, URL (default: MANUAL)         |
| `sourceUrl`   | string?       | Origin URL                            |
| `contentHash` | string        | SHA-256 for deduplication             |
| `metadata`    | JSON          | Extensible metadata (default: {})     |
| `createdAt`   | DateTime      | Creation date                         |
| `updatedAt`   | DateTime      | Last update                           |

**Constraints:**

- Unique on `[projectId, contentHash]`

**Relationships:**

- Has one optional `DocumentEmbedding` (1:1)

---

### DocumentEmbedding

Vector embedding for semantic search.

| Field         | Type          | Description                                              |
| ------------- | ------------- | -------------------------------------------------------- |
| `id`          | string (CUID) | Primary key                                              |
| `documentId`  | string        | FK to Document (unique)                                  |
| `projectId`   | string        | FK to Project (denormalized for query efficiency)        |
| `embedding`   | vector(1536)  | OpenAI text-embedding-3-small vector                     |
| `contentHash` | string        | Hash to detect content changes                           |
| `model`       | string        | Embedding model used (default: "text-embedding-3-small") |
| `inputTokens` | number        | Tokens consumed for embedding (default: 0)               |
| `createdAt`   | DateTime      | Creation date                                            |
| `updatedAt`   | DateTime      | Last update                                              |

**Constraints:**

- Unique on `documentId`
- IVFFlat index on `embedding` for efficient similarity search

**Notes:**

- `projectId` is denormalized from Document for query performance
- `contentHash` enables skip logic (don't re-embed unchanged content)
- Uses pgvector extension for vector operations

---

### Instruction

AI instruction configuration for projects.

| Field            | Type          | Description                                  |
| ---------------- | ------------- | -------------------------------------------- |
| `id`             | string (CUID) | Primary key                                  |
| `projectId`      | string?       | FK to Project (null for ORGANIZATION/PUBLIC)  |
| `organizationId` | string?       | FK to Organization (null for PRIVATE)         |
| `name`           | string        | Instruction name                             |
| `type`           | enum          | AGENT, COMMAND, MEMORY, SKILL, TEMPLATE      |
| `visibility`     | enum          | PUBLIC, ORGANIZATION, PRIVATE                |
| `content`        | text          | Instruction content (markdown)               |
| `description`    | string?       | Short description                            |
| `metadata`       | JSON          | Extensible metadata (default: {})            |
| `createdAt`      | DateTime      | Creation date                                |
| `updatedAt`      | DateTime      | Last update                                  |

**Constraints:**

- Unique on `[name, type, projectId]`

**Visibility → ownership mapping:**

- `PRIVATE` → belongs to Project (`projectId` set, `organizationId` null)
- `ORGANIZATION` → belongs to Organization (`organizationId` set, `projectId` null)
- `PUBLIC` → belongs to Organization (`organizationId` set, `projectId` null)

**Relationships:**

- Has one optional `InstructionEmbedding` (1:1)

---

### InstructionEmbedding

Vector embedding for instruction semantic search.

| Field            | Type          | Description                                              |
| ---------------- | ------------- | -------------------------------------------------------- |
| `id`             | string (CUID) | Primary key                                              |
| `instructionId`  | string        | FK to Instruction (unique)                               |
| `projectId`      | string?       | Denormalized from Instruction (null when ORGANIZATION/PUBLIC) |
| `organizationId` | string?       | Denormalized from Instruction (null when PRIVATE)        |
| `embedding`      | vector(1536)  | OpenAI text-embedding-3-small vector                     |
| `contentHash`    | string        | Hash of name+description+content to detect changes       |
| `model`          | string        | Embedding model used (default: "text-embedding-3-small") |
| `inputTokens`    | number        | Tokens consumed for embedding (default: 0)               |
| `createdAt`      | DateTime      | Creation date                                            |
| `updatedAt`      | DateTime      | Last update                                              |

**Constraints:**

- Unique on `instructionId`

**Notes:**

- `projectId` and `organizationId` are denormalized for query performance
- `contentHash` enables skip logic (don't re-embed unchanged content)
- Searches use `WHERE instructionId = ANY($ids)` with pre-merged ID sets (visibility-aware)
- Uses pgvector extension for vector operations

---

## Audit Log Entity

### AuditLog

Immutable audit trail for security monitoring and forensics.

| Field            | Type          | Description                                      |
| ---------------- | ------------- | ------------------------------------------------ |
| `id`             | string (CUID) | Primary key                                      |
| `timestamp`      | DateTime      | When the action occurred (default: now)          |
| `action`         | string        | Event type from `AuditAction` taxonomy           |
| `category`       | string        | DOCUMENT, INSTRUCTION, QUERY, ADMIN, AUDIT       |
| `resourceType`   | string?       | Organization, Project, Document, Instruction, Query |
| `resourceId`     | string?       | ID of affected resource                          |
| `organizationId` | string?       | Organization context                             |
| `projectId`      | string?       | Project context                                  |
| `requestId`      | string?       | Request correlation ID                           |
| `source`         | string?       | `"mcp"` or null                                  |
| `metadata`       | JSON?         | Structured, sanitized metadata (default: {})     |

---

## Database Constraints

| Constraint                   | Type             | Fields                       |
| ---------------------------- | ---------------- | ---------------------------- |
| Organization.slug            | Unique           | `slug`                       |
| Project                      | Composite Unique | `[organizationId, slug]`     |
| Document                     | Composite Unique | `[projectId, contentHash]`   |
| Instruction                  | Composite Unique | `[name, type, projectId]`    |
| DocumentEmbedding.documentId | Unique           | `documentId`                 |
| InstructionEmbedding.instructionId | Unique     | `instructionId`              |

---

## Cascade Behavior

| Parent       | Child             | On Delete             |
| ------------ | ----------------- | --------------------- |
| Organization | Project           | CASCADE               |
| Organization | Instruction       | CASCADE               |
| Organization | AuditLog          | (no explicit cascade) |
| Project      | Document          | CASCADE               |
| Project      | Instruction       | CASCADE               |
| Document     | DocumentEmbedding | CASCADE               |
| Instruction  | InstructionEmbedding | CASCADE            |

---

## See Also

- [Architecture Overview](overview.md) - System design
- [Patterns](patterns.md) - Code patterns and conventions
- [Multi-tenancy](../concepts/multi-tenancy.md) - Data isolation
