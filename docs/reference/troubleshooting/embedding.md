[Home](../../index.md) > [Reference](../index.md) > [Troubleshooting](index.md) > **Embedding Troubleshooting**

# Embedding Troubleshooting Reference

Error codes, common issues, and debugging techniques for semantic search.

## Error Codes

| Code                             | Description             | Cause                     | Resolution                       |
| -------------------------------- | ----------------------- | ------------------------- | -------------------------------- |
| `EMBEDDING_API_ERROR`            | OpenAI API call failed  | Network/API issues        | Check `OPENAI_API_KEY`, retry later |
| `EMBEDDING_NOT_CONFIGURED`       | Provider not configured | Missing config            | Set `EMBEDDING_DEFAULT_PROVIDER` |
| `EMBEDDING_RATE_LIMITED`         | Rate limit exceeded     | Too many requests         | Wait and retry, increase limit   |
| `EMBEDDING_TOKEN_LIMIT_EXCEEDED` | Document too large      | Content > 8191 tokens     | Split document or truncate       |
| `EMBEDDING_DISABLED`             | Feature disabled        | `EMBEDDING_ENABLED=false` | Enable if needed                 |
| `VECTOR_SEARCH_FAILED`           | pgvector query error    | SQL error                 | Check indexes, database logs     |
| `PGVECTOR_NOT_INSTALLED`         | Extension missing       | pgvector not installed    | Install extension                |

## Common Issues

### Documents Not Being Embedded

**Symptoms:**

- New documents don't appear in semantic search
- `pendingDocuments > 0` in stats

**Causes:**

1. `EMBEDDING_ENABLED=false`
2. `EMBEDDING_DEFAULT_PROVIDER=stub` in production
3. Missing `OPENAI_API_KEY`

**Resolution:**

```bash
# Check configuration
echo $EMBEDDING_ENABLED
echo $EMBEDDING_DEFAULT_PROVIDER
echo $OPENAI_API_KEY | head -c 10  # Don't expose full key

# Verify via MCP dry-run backfill (checks embedding config)
curl -s -X POST http://localhost:3000/api/v1/mcp \
  -H "x-ks-org: YOUR_ORG" \
  -H "x-ks-project: YOUR_PROJECT" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"knowstack.backfill_embeddings","arguments":{"dryRun":true}}}'
```

### Semantic Search Not Used

**Symptoms:**

- `X-Semantic-Search: false` in response headers
- All documents returned instead of top-K

**Causes:**

1. Embedding disabled
2. pgvector not available
3. No documents have embeddings

**Resolution:**

```bash
# Test via MCP endpoint with config headers
curl -v -X POST http://localhost:3000/api/v1/mcp \
  -H "x-ks-org: YOUR_ORG" \
  -H "x-ks-project: YOUR_PROJECT" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' 2>&1 | grep -i semantic

# Check pgvector
psql -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### Fallback to All-Docs

**Symptoms:**

- `X-Semantic-Search: true` but poor results
- `fallbackUsed: true` in response

**Causes:**

1. OpenAI API error during query
2. pgvector query timeout
3. All embeddings deleted

**Resolution:**
Check application logs for:

```
WARN: Semantic search failed, falling back to all-docs
```

### pgvector Not Available

**Symptoms:**

- Backfill dry-run fails with `PGVECTOR_NOT_INSTALLED`
- Error: `PGVECTOR_NOT_INSTALLED`

**Resolution:**

```sql
-- Install extension (requires superuser)
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Poor Search Quality

**Symptoms:**

- Semantic search returns irrelevant documents
- Better results with keyword search only

**Causes:**

1. Documents too short/generic
2. Hybrid weight too high/low
3. Top-K too small

**Resolution:**

```bash
# Adjust hybrid weight
EMBEDDING_HYBRID_WEIGHT=0.5  # Equal semantic/keyword

# Increase result count
EMBEDDING_TOP_K=20
```

## Debugging Techniques

### Check Embedding Status

```sql
-- Count embeddings per project
SELECT "projectId", COUNT(*)
FROM document_embeddings
GROUP BY "projectId";

-- Find documents without embeddings
SELECT d.id, d.title
FROM documents d
LEFT JOIN document_embeddings de ON d.id = de."documentId"
WHERE de.id IS NULL;
```

### Verify Vector Index

```sql
-- Check index exists
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'document_embeddings';

-- Check index health
SELECT pg_relation_size('document_embeddings_embedding_idx');
```

### Test Embedding Provider

```bash
# Verify pgvector via SQL
psql -c "SELECT * FROM pg_extension WHERE extname = 'vector';"

# Test embedding via MCP dry-run backfill
curl -s -X POST http://localhost:3000/api/v1/mcp \
  -H "x-ks-org: YOUR_ORG" \
  -H "x-ks-project: YOUR_PROJECT" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"knowstack.backfill_embeddings","arguments":{"dryRun":true}}}'
```

### Check Response Headers

```bash
curl -v -X POST http://localhost:3000/api/v1/mcp \
  -H "x-ks-org: YOUR_ORG" \
  -H "x-ks-project: YOUR_PROJECT" \
  -H "Content-Type: application/json" \
  -d '{"query": "test"}' 2>&1 | grep -E "X-Semantic|X-Usage"
```

### Logs to Watch

Key log messages:

```
INFO: Document embedding created
WARN: Semantic search failed, falling back to all-docs
WARN: Embedding failed for document
ERROR: OpenAI embedding failed
```

## Performance Issues

### Slow Embedding

**Cause:** OpenAI API latency

**Resolution:**

- Use batch operations for imports
- Consider caching query embeddings (future feature)

### Slow Vector Search

**Cause:** Missing or suboptimal index

**Resolution:**

```sql
-- Verify IVFFlat index
SELECT * FROM pg_indexes
WHERE indexdef LIKE '%ivfflat%';

-- If missing, create it
CREATE INDEX IF NOT EXISTS document_embeddings_embedding_idx
ON document_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

## See Also

- [Embedding Configuration](../configuration/embedding.md) - Environment variables and provider setup
- [Semantic Retrieval Architecture](../../explanation/concepts/semantic-retrieval.md) - How embedding and search works
- [MCP Reference](../api/mcp.md) - MCP tool documentation
