[Home](../../index.md) > [Explanation](../index.md) > [Architecture](index.md) > **Overview**

# Architecture Overview

KnowStack is a local-first, multi-tenant platform for AI-powered documentation queries, built with **NestJS v11** following **Clean Architecture**, **SOLID principles**, and **Domain-Driven Design**. It exposes all operations via the **Model Context Protocol (MCP)** with no authentication layer — tenant context is resolved from config headers.

## Design Principles

KnowStack follows these core principles:

### SOLID Principles

| Principle | Description           | Example in Codebase                                                                                         |
| --------- | --------------------- | ----------------------------------------------------------------------------------------------------------- |
| **SRP**   | Single Responsibility | Each service has one job: `DocumentService` retrieves docs, `QueryOrchestratorService` orchestrates queries |
| **OCP**   | Open/Closed           | AI providers extend `IAIProvider` without modifying existing code                                           |
| **LSP**   | Liskov Substitution   | Any `IAIProvider` (OpenAI, Stub) can be swapped transparently                                               |
| **ISP**   | Interface Segregation | Small, focused interfaces: `IDocumentRepository`, `IInstructionRepository`                                   |
| **DIP**   | Dependency Inversion  | Services depend on interfaces (`IAIProvider`), not implementations (`OpenAIProvider`)                       |

### Clean Architecture

Strict layer separation with dependencies pointing inward:

```
Presentation → Application → Core ← Infrastructure
```

- **Core**: Pure domain logic, no external dependencies
- **Application**: Business orchestration, depends only on Core interfaces
- **Infrastructure**: Implements Core interfaces (Prisma, Redis, OpenAI)
- **Presentation**: HTTP handlers, calls Application services

### Clean Code

- Meaningful names (no abbreviations except standard ones like `dto`, `id`)
- Small, focused functions (single responsibility)
- Explicit error handling (custom domain exceptions)
- No magic numbers (use constants)
- Self-documenting code over comments

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION LAYER                           │
│  MCP Controller: POST/GET /mcp (Model Context Protocol)             │
│  Health: GET /health                                                │
│  Metrics: GET /metrics                                              │
│  Tenant resolution via ConfigTenantMiddleware (x-ks-org, x-ks-project)│
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                            │
│  Query: Orchestrator, ContextBuilder, ResponseFormatter            │
│  Documents: Document retrieval                                      │
│  Ingestion: Document ingestion from URL/Manual                      │
│  Instructions: AI instruction management                            │
│  MCP: Tool handler service                                          │
│  Audit: Audit log recording                                         │
│  Embedding: Semantic search, backfill                               │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                           CORE LAYER                                │
│  Entities: Organization, Project, Document, DocumentEmbedding,      │
│            Instruction, InstructionEmbedding, AuditLog              │
│  Interfaces: Repository + Service contracts, MCP interfaces         │
│  Exceptions: Domain-specific errors                                 │
└─────────────────────────────────────────────────────────────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                      INFRASTRUCTURE LAYER                           │
│  Database: Prisma + PostgreSQL 16                                   │
│  Cache: Redis 7 with ioredis                                        │
│  AI: OpenAI + Stub providers (factory pattern)                      │
│  MCP: MCP SDK server factory                                        │
│  Observability: Structured logging, Prometheus metrics              │
└─────────────────────────────────────────────────────────────────────┘
```

## Folder Structure

```
src/
├── core/                   # Domain layer (no external dependencies)
│   ├── entities/           # Domain entities
│   │   ├── organization.entity.ts
│   │   ├── project.entity.ts
│   │   ├── document.entity.ts
│   │   ├── document-embedding.entity.ts
│   │   ├── instruction.entity.ts
│   │   ├── instruction-embedding.entity.ts
│   │   └── audit-log.entity.ts
│   ├── interfaces/         # Repository & service contracts
│   │   ├── config/         # KnowStack config interfaces
│   │   ├── mcp/            # MCP server factory interface
│   │   ├── repositories/   # Repository interfaces
│   │   └── services/       # IAIProvider, ICache, ILogger
│   └── exceptions/         # Domain exceptions
│
├── application/            # Business logic
│   ├── documents/services/ # Document retrieval
│   ├── query/              # Query pipeline
│   │   ├── dto/
│   │   └── services/       # Orchestrator, ContextBuilder, Formatter
│   ├── ingestion/          # Document ingestion
│   │   ├── dto/
│   │   └── services/
│   ├── instructions/       # AI instruction management
│   │   ├── dto/
│   │   └── services/       # InstructionService
│   ├── mcp/                # MCP tool handler
│   │   └── services/       # McpToolHandlerService
│   ├── audit/              # Audit logging
│   │   └── services/
│   ├── cache/services/     # Cache invalidation
│   ├── security/           # Security constants
│   └── embedding/          # Semantic search
│       ├── dto/
│       └── services/       # DocumentEmbeddingService, SemanticSearchService, EmbeddingBackfillService,
│                          # InstructionEmbeddingService, InstructionBackfillService, InstructionSearchService
│
├── infrastructure/         # External implementations
│   ├── ai/                 # AI provider implementations
│   │   └── providers/      # OpenAI, Stub
│   ├── cache/              # Redis service, NoOp fallback
│   ├── config/             # ai, redis configurations
│   ├── database/
│   │   ├── prisma/         # Prisma service
│   │   └── repositories/   # Repository implementations
│   ├── mcp/                # MCP SDK server factory
│   ├── ingestion/          # URL fetcher
│   ├── embedding/          # Embedding provider implementations
│   │   └── providers/      # OpenAI, Stub
│   └── observability/      # Logging & metrics
│       ├── services/       # StructuredLogger, MetricsService
│       └── controllers/    # MetricsController (/metrics)
│
├── presentation/mcp/       # MCP presentation layer
│   ├── mcp.controller.ts   # POST/GET/DELETE /mcp endpoints
│   └── mcp.module.ts       # MCP NestJS module
│
└── common/                 # Shared utilities
    ├── decorators/         # @Tenant, @Public
    ├── middleware/         # ConfigTenantMiddleware, RequestContextMiddleware
    ├── interceptors/       # LoggingInterceptor, SecurityHeadersInterceptor
    ├── filters/            # GlobalExceptionFilter
    ├── services/           # TenantContext, RequestContext
    ├── types/              # Shared types, Express augmentations
    └── utils/              # constants.ts, settings.ts, crypto.util.ts
```

## Layer Responsibilities

### Core (`/src/core`)

Pure domain logic with no external dependencies.

**Put here:**

- Entity interfaces (Organization, Project, Document, Instruction)
- Repository interfaces (IDocumentRepository, IInstructionRepository)
- Service interfaces (IAIProvider, ICacheService)
- MCP interfaces (IMcpServerFactory)
- Domain exceptions (OrganizationException, DocumentException)

**Don't put here:**

- Implementations
- External dependencies (Prisma, HTTP, Redis)

### Application (`/src/application`)

Business logic and orchestration.

**Put here:**

- Services that coordinate repositories
- DTOs for request/response validation
- Mappers for entity to DTO transformation
- Use case orchestration

**Example:** `QueryOrchestratorService` coordinates documents, AI, and cache.

### Infrastructure (`/src/infrastructure`)

External service implementations.

**Put here:**

- Repository implementations (Prisma)
- AI provider implementations (OpenAI, Stub)
- Cache implementations (Redis)
- MCP SDK server factory implementation

**Example:** `DocumentRepository` implements `IDocumentRepository` using Prisma.

### Presentation (`/src/presentation/mcp`)

MCP delivery layer.

**Put here:**

- MCP controller (request handler for Model Context Protocol)
- NestJS modules
- MCP-specific concerns

**Rule:** Keep the controller thin - delegate to application services via MCP tool handlers.

### Common (`/src/common`)

Cross-cutting concerns.

**Put here:**

- Decorators (@Tenant, @Public)
- Middleware (ConfigTenantMiddleware, RequestContextMiddleware)
- Interceptors (LoggingInterceptor)
- Filters (GlobalExceptionFilter)
- Request-scoped services (TenantContextService)
- Shared utilities (constants, crypto)

## Dependency Rule

Dependencies point inward:

```
Presentation → Application → Core ← Infrastructure
```

- Core has no dependencies
- Application depends on Core interfaces
- Infrastructure implements Core interfaces
- Presentation calls Application services

---

## Data Model

### Entity Relationships

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

### Core Entities

| Entity                | Purpose       | Key Fields                                     |
| --------------------- | ------------- | ---------------------------------------------- |
| **Organization**      | Tenant        | name, slug (unique)                            |
| **Project**           | Doc namespace | organizationId, name, slug                     |
| **Document**          | Knowledge     | title, content, sourceType, contentHash        |
| **DocumentEmbedding** | Vectors       | documentId, embedding, contentHash, model      |
| **Instruction**       | AI instruct.  | name, type, visibility, content, projectId     |
| **InstructionEmbedding** | Vectors    | instructionId, embedding, contentHash, model   |
| **AuditLog**          | Audit trail   | action, category, organizationId, projectId    |

### Database Constraints

- **Unique**: Organization.slug
- **Composite Unique**: [organizationId, slug] on Project, [projectId, contentHash] on Document, [name, type, projectId] on Instruction
- **Cascade Delete**: Organization → Projects → Documents

---

## Tenant Resolution

### Config-Driven Tenant Context (Local-First)

KnowStack uses a local-first, no-auth architecture. Tenant context is resolved from HTTP headers by `ConfigTenantMiddleware`:

```
┌─────────────────────────────────────────────────────────────────────┐
│                   CONFIG TENANT RESOLUTION                          │
├─────────────────────────────────────────────────────────────────────┤
│  Headers:                                                           │
│  - x-ks-org: Organization slug                                     │
│  - x-ks-project: Project slug                                      │
│  - x-ks-context: Optional context identifier                       │
│                                                                     │
│  Resolution: Slug lookup → org/project IDs → TenantContext          │
│  Auto-create: Organizations and projects are created on first use  │
└─────────────────────────────────────────────────────────────────────┘
```

No authentication guards, JWT tokens, or API keys are used. The MCP client provides organization and project context via headers.

---

## Request Lifecycle

### MCP Request

```
HTTP Request (POST/GET /mcp with x-ks-org, x-ks-project headers)
    ↓
[CLS Middleware] - AsyncLocalStorage initialized
    ↓
[RequestContextMiddleware] - Sets requestId, source
    ↓
[ConfigTenantMiddleware] - Resolves org/project slugs → TenantContext
    ↓
[McpController] - Creates MCP session, delegates to SDK transport
    ↓
[MCP Tool Handler] - Routes to application services
    ↓
HTTP Response (MCP protocol / SSE)
```

---

## Query Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    QueryOrchestratorService                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Retrieve Documents ─────────────────────────────────────────────►│
│     ├── Semantic Search (if enabled)                                │
│     │   SemanticSearchService.search() → top-K relevant docs        │
│     └── Fallback: All Documents                                     │
│         DocumentService.getDocumentsForProject()                    │
│                                                                     │
│  2. Check Cache ──────────────────────────────────────────────────► │
│     CacheService.get(query + context + docsHash)                    │
│     ├── HIT: Return cached response                                │
│     └── MISS: Continue pipeline                                    │
│                                                                     │
│  3. Build Context ────────────────────────────────────────────────► │
│     ContextBuilderService.buildMessages()                           │
│     [system prompt with docs, user query]                           │
│                                                                     │
│  4. Call AI Provider ─────────────────────────────────────────────► │
│     IAIProvider.complete() (OpenAI/Stub)                           │
│                                                                     │
│  5. Cache Result (fire-and-forget) ───────────────────────────────► │
│     CacheService.set()                                              │
│                                                                     │
│  6. Format Response ──────────────────────────────────────────────► │
│     ResponseFormatterService.format()                               │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Semantic Retrieval

When `EMBEDDING_ENABLED=true` and pgvector is available, the query pipeline uses semantic search:

1. **Query Embedding**: User query is converted to a vector using OpenAI's text-embedding-3-small
2. **Vector Search**: pgvector finds top-K most similar documents using cosine similarity
3. **Hybrid Ranking**: Results combine semantic similarity (70%) with keyword matching (30%)
4. **Fallback**: On any error, falls back to returning all documents

See [Semantic Retrieval](../concepts/semantic-retrieval.md) for detailed architecture.

---

## API Surface

### HTTP Endpoints

```
GET    /metrics                 Prometheus metrics
POST   /mcp                     MCP protocol handler
GET    /mcp                     MCP protocol handler (read operations)
DELETE /mcp                     Returns 405 (stateless, no sessions)
```

### MCP Tools

All business operations are exposed as MCP tools via the `/mcp` endpoint:

- **knowstack.query** - AI-powered documentation query
- **knowstack.save_documents** - Save/update documents
- **knowstack.get_documents** - List, search, or get documents by ID
- **knowstack.delete_documents** - Delete a document
- **knowstack.save_agents/commands/skills/templates/memory** - Save instruction types
- **knowstack.get_agents/commands/skills/templates/memory** - Get instruction types
- **knowstack.delete_agents/commands/skills/templates/memory** - Delete instruction types
- **knowstack.update_memory** - Update memory entry with str_replace semantics
- **knowstack.search_instructions** - Search across instruction types
- **knowstack.backfill_instructions** - Backfill instruction embeddings
- **knowstack.backfill_embeddings** - Backfill document embeddings

Tenant context is provided via `x-ks-org` and `x-ks-project` headers on every request.

---

## Infrastructure

### External Integrations

| Service       | Purpose                    | Status   |
| ------------- | -------------------------- | -------- |
| PostgreSQL 16 | Primary database           | Active   |
| pgvector      | Vector similarity search   | Optional |
| Redis 7       | Cache                      | Optional |
| OpenAI        | AI completions, embeddings | Optional |

### Docker Stack

```yaml
services:
  app: # NestJS on Node 20-slim, non-root user
  db: # PostgreSQL 16 Alpine, health checks
  redis: # Redis 7 Alpine, AOF persistence
```

---

## Tech Stack

| Category  | Technology                   |
| --------- | ---------------------------- |
| Framework | NestJS 11                    |
| Language  | TypeScript 5.9 (strict mode) |
| ORM       | Prisma 5                     |
| Database  | PostgreSQL 16                |
| Cache     | Redis 7 (ioredis)            |
| Testing   | Vitest 4                     |
| AI        | OpenAI SDK                   |
| Protocol  | MCP (Model Context Protocol) |

---

## Project Stats

| Metric                | Count |
| --------------------- | ----- |
| Domain Entities       | 7     |
| Repository Interfaces | 6+    |
| Service Interfaces    | 5+    |
| Custom Exceptions     | 15    |
| MCP Tools             | 23    |
| HTTP Endpoints        | 2     |
| Unit Tests            | 100+  |

---

## See Also

- [Adding Features](../../contributing/adding-features.md)
- [Patterns](patterns.md)
- [Document Ingestion](document-ingestion.md)
- [Observability](observability.md)
- [Semantic Retrieval](../concepts/semantic-retrieval.md)
- [MCP API Reference](../../reference/api/mcp.md)
