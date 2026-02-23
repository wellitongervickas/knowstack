[Home](../../index.md) > [Explanation](../index.md) > [Concepts](index.md) > **Embedding Costs**

# Embedding Cost Analysis

This document explains the cost structure of semantic search and helps you understand your OpenAI API costs.

## Cost Components

### 1. Document Embedding (One-time)

When documents are created or updated, they're embedded once:

| Cost Factor  | Value                   |
| ------------ | ----------------------- |
| Model        | text-embedding-3-small  |
| Price        | $0.02 per 1M tokens     |
| Avg document | ~500 tokens             |
| Cost per doc | ~$0.00001 (0.001 cents) |

**Example**: Embedding 10,000 documents

- Estimated tokens: 5,000,000
- Cost: ~$0.10

### 2. Instruction Embedding (One-time)

When instructions are created or updated, they're embedded once:

| Cost Factor       | Value                   |
| ----------------- | ----------------------- |
| Model             | text-embedding-3-small  |
| Price             | $0.02 per 1M tokens     |
| Avg instruction   | ~300 tokens             |
| Cost per instr    | ~$0.000006 (0.0006 cents) |

**Example**: Embedding 100 instructions (agents, skills, commands, templates, memory)

- Estimated tokens: 30,000
- Cost: ~$0.0006

Instructions are typically smaller than documents and change less frequently, making their embedding cost negligible.

### 3. Query Embedding (Per-query)

Each query is embedded to find similar documents:

| Cost Factor    | Value                     |
| -------------- | ------------------------- |
| Avg query      | ~50 tokens                |
| Cost per query | ~$0.000001 (0.0001 cents) |

**Example**: 100,000 queries per month

- Estimated tokens: 5,000,000
- Cost: ~$0.10

### 4. Re-embedding (On content change)

Documents are only re-embedded when content changes (hash-based check):

- No change → No cost
- Content updated → Same as new document

## Cost Comparison

### Before Semantic Search

Without embeddings, all documents are sent to the AI for every query:

| Metric                 | Value              |
| ---------------------- | ------------------ |
| Documents per query    | 50 (example)       |
| Tokens per document    | 500                |
| Context tokens         | 25,000             |
| AI cost (GPT-4.1-mini) | ~$0.0075 per query |

### After Semantic Search

With embeddings, only relevant documents (top-K) are used:

| Metric                 | Value                |
| ---------------------- | -------------------- |
| Documents per query    | 10 (top-K)           |
| Tokens per document    | 500                  |
| Context tokens         | 5,000                |
| AI cost (GPT-4.1-mini) | ~$0.0015 per query   |
| Embedding cost         | ~$0.000001 per query |

**Savings per query**: ~$0.006 (80% reduction)

## Cost Savings

### Setup Cost vs. Savings

Initial setup cost (embedding 10,000 docs): $0.10
Savings per query: $0.006

**Embedding pays for itself after ~17 queries.**

### Monthly Projection

| Queries/Month | Without Embedding | With Embedding | Savings |
| ------------- | ----------------- | -------------- | ------- |
| 1,000         | $7.50             | $1.60          | $5.90   |
| 10,000        | $75.00            | $16.00         | $59.00  |
| 100,000       | $750.00           | $160.00        | $590.00 |

## Cost Optimization Strategies

### 1. Efficient Document Size

- Keep documents focused and concise
- Split very large documents (future feature)
- Remove unnecessary boilerplate

### 2. Cache Optimization

The query cache reduces both AI and embedding costs:

- Identical queries hit cache
- No embedding cost on cache hit
- No AI cost on cache hit

### 3. Batch Operations

Use batch embedding for imports:

- Fewer API calls
- More efficient token packing
- Lower network overhead

## Tracking Costs

### Usage Records

Embedding tokens are tracked separately in usage records:

| Operation                | Description                    |
| ------------------------ | ------------------------------ |
| `embedding`              | Query embedding tokens         |
| `document_embedding`     | Document embedding tokens      |
| `instruction_embedding`  | Instruction embedding tokens   |
| `query`                  | AI completion tokens           |

### Monitoring

Check embedding statistics:

```bash
GET /organizations/:orgId/embeddings/stats/:projectId
```

Response includes:

- Total documents
- Embedded documents count
- Pending documents count

## See Also

- [Semantic Retrieval](semantic-retrieval.md) - Vector search architecture
- [Embedding Configuration](../../reference/configuration/embedding.md) - Embedding setup and tuning
