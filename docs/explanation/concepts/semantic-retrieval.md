[Home](../../index.md) > [Explanation](../index.md) > [Concepts](index.md) > **Semantic Retrieval**

# Semantic Retrieval Architecture

This document explains how KnowStack uses semantic search to improve query results by understanding meaning, not just matching keywords.

## Why Semantic Search?

Traditional keyword search has limitations:

- **Synonyms**: "car" doesn't match "automobile"
- **Paraphrasing**: "How do I start the app?" doesn't match "run the application"
- **Context**: Keywords lose meaning without context

Semantic search solves these problems by converting text into high-dimensional vectors that capture meaning.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     SEMANTIC QUERY PIPELINE                                  │
└─────────────────────────────────────────────────────────────────────────────┘

BEFORE (without embeddings):
Query → Fetch ALL docs → Build context → Call AI → Response

AFTER (with embeddings):
Query → Embed query → [Vector search + Keyword search] → Merge & rank →
        Select top-K → Build context → Call AI → Response
```

## How It Works

### 1. Document Embedding

When a document is created or updated:

1. Title and content are combined
2. Text is sent to OpenAI's embedding API
3. A 1536-dimensional vector is returned
4. Vector is stored in PostgreSQL with pgvector

### 2. Instruction Embedding

When an instruction (agent, command, skill, template, or memory) is created or updated:

1. Name, description, and content are combined (`name\n\ndescription\n\ncontent`)
2. Text is embedded using the same model as documents
3. Vector is stored in `instruction_embeddings` table with pgvector
4. Content hash prevents re-embedding unchanged instructions (fire-and-forget)

**Key difference from documents:** Instructions use visibility merge (PUBLIC < ORGANIZATION < PRIVATE) before search. The search service first collects all valid instruction IDs from the merged set, then queries the vector database with `WHERE instructionId = ANY($ids)` instead of filtering by `projectId`.

### 3. Query Processing

When a user submits a query:

1. Query text is embedded using the same model
2. Vector similarity search finds related documents/instructions
3. Keyword search finds exact matches
4. Results are merged using hybrid scoring

### 3. Hybrid Search Algorithm

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      HYBRID SEARCH ALGORITHM                                 │
└─────────────────────────────────────────────────────────────────────────────┘

                          User Query
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │  Embed Query    │             │  Extract Terms  │
    │  (1536 dims)    │             │  (tokenize)     │
    └────────┬────────┘             └────────┬────────┘
             │                               │
             ▼                               ▼
    ┌─────────────────┐             ┌─────────────────┐
    │  Vector Search  │             │  Keyword Search │
    │  (cosine sim)   │             │  (ILIKE)        │
    └────────┬────────┘             └────────┬────────┘
             │                               │
             └───────────────┬───────────────┘
                             ▼
                   ┌─────────────────┐
                   │  Merge & Rank   │
                   │  0.7×sem + 0.3×kw│
                   └────────┬────────┘
                            │
                            ▼
                   ┌─────────────────┐
                   │  Select Top-K   │
                   │  (K=10 default) │
                   └─────────────────┘
```

### 4. Scoring

Combined scores use weighted averaging:

- **Semantic weight**: 70% (configurable via `EMBEDDING_HYBRID_WEIGHT`)
- **Keyword weight**: 30%

Match types:

- `semantic`: Only found via vector similarity
- `keyword`: Only found via text matching
- `hybrid`: Found by both methods (highest confidence)

## Technology Choices

### Embedding Model: text-embedding-3-small

| Spec       | Value                  | Rationale                   |
| ---------- | ---------------------- | --------------------------- |
| Model      | text-embedding-3-small | Best cost/quality ratio     |
| Dimensions | 1536                   | Full precision for accuracy |
| Max tokens | 8,191                  | Handles most documents      |
| Cost       | ~$0.02/1M tokens       | Very economical             |

### Vector Database: pgvector

We chose pgvector over external vector databases because:

- **Simplicity**: Uses existing PostgreSQL infrastructure
- **Transactions**: ACID compliance with document data
- **Tenant isolation**: Same `WHERE project_id = $id` pattern
- **Sufficient scale**: IVFFlat handles up to ~1M vectors efficiently

## Security Considerations

### Tenant Isolation

All vector queries include tenant isolation:

```sql
-- Documents: scoped by projectId
SELECT ... FROM document_embeddings
WHERE project_id = $projectId
ORDER BY embedding <=> $queryVector

-- Instructions: scoped by pre-merged instruction IDs
SELECT ... FROM instruction_embeddings
WHERE "instructionId" = ANY($instructionIds)
ORDER BY embedding <=> $queryVector
```

### What's Never Logged

- Document content
- Embedding vectors
- User queries

### What's Logged

- Operation type (embed, search)
- Token counts (for analytics)
- Document IDs (for debugging)

## Fallback Behavior

The system gracefully degrades:

| Scenario                  | Behavior                        |
| ------------------------- | ------------------------------- |
| `EMBEDDING_ENABLED=false` | Use all docs (no embedding)     |
| OpenAI API error          | Fallback to keyword-only        |
| pgvector not installed    | Disable embedding, log warning  |
| Document has no embedding | Include in keyword results only |

## See Also

- [Embedding Cost Analysis](embedding-costs.md) - Cost evaluation and optimization
- [Embedding Configuration](../../reference/configuration/embedding.md) - Setup and tuning
- [Backfill Guide](../../guides/backfill-embeddings.md) - Embedding existing documents
- [Troubleshooting](../../reference/troubleshooting/embedding.md) - Common issues and solutions
