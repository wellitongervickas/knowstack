[Home](../index.md) > [Guides](index.md) > **Backfill Embeddings**

# Backfill Embeddings Guide

How to add embeddings to existing documents and instructions in your project.

## Prerequisites

- `EMBEDDING_ENABLED=true` in environment
- `EMBEDDING_DEFAULT_PROVIDER=openai` (or `stub` for testing)
- `OPENAI_API_KEY` set (for production use)
- pgvector extension installed
- **Project ID is required** for all backfill operations (organization-wide backfill is not supported)

## Step 1: Estimate Cost (Dry Run)

Before running the actual backfill, estimate the cost:

### Using MCP

Call the `backfill_embeddings` tool via your MCP client with `dryRun: true`:

```json
{
  "projectId": "YOUR_PROJECT",
  "dryRun": true
}
```

The config headers (`x-ks-org`, `x-ks-project`) identify the tenant context.

Response:

```json
{
  "total": 500,
  "embedded": 0,
  "skipped": 0,
  "failed": 0,
  "estimatedCostUsd": 0.005,
  "durationMs": 234
}
```

## Step 2: Choose Batch Size

Batch size affects:

- API rate limits (larger batches = fewer API calls)
- Memory usage (smaller batches = less memory)
- Error recovery (smaller batches = finer-grained progress)

Recommendations:

- Small projects (<100 docs): `batchSize: 50`
- Medium projects (100-1000 docs): `batchSize: 50`
- Large projects (>1000 docs): `batchSize: 25`

## Step 3: Run Backfill

### Using MCP

Call the `backfill_embeddings` tool:

```json
{
  "projectId": "YOUR_PROJECT",
  "batchSize": 50
}
```

## Step 4: Verify Completion

Check embedding statistics via MCP or a direct cURL call:

```bash
# Verify via MCP dry-run (backfill_embeddings with dryRun: true)
curl -s -X POST "http://localhost:3000/api/v1/mcp" \
  -H "x-ks-org: YOUR_ORG" \
  -H "x-ks-project: YOUR_PROJECT" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"knowstack.backfill_embeddings","arguments":{"dryRun":true}}}'
```

Expected response from stats:

```json
{
  "totalDocuments": 500,
  "embeddedDocuments": 498,
  "pendingDocuments": 2
}
```

If `pendingDocuments > 0`, check the errors from the backfill response.

## Backfill Instructions

Instructions (agents, commands, skills, templates, memory) also support vector embeddings for hybrid search. Use the `backfill_instructions` MCP tool:

### Dry Run

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "knowstack.backfill_instructions",
    "arguments": { "dryRun": true }
  }
}
```

### Run Backfill

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "knowstack.backfill_instructions",
    "arguments": {}
  }
}
```

Optional parameters: `type` (filter by instruction type), `force` (regenerate all).

**Note:** The setup script (`pnpm setup:seed`) automatically runs instruction backfill after seeding.

## Step 5: Test Semantic Search

Verify semantic search is working by calling the `knowstack_query` MCP tool:

```json
{
  "query": "your test query"
}
```

Or via cURL:

```bash
curl -X POST "http://localhost:3000/api/v1/mcp" \
  -H "x-ks-org: YOUR_ORG" \
  -H "x-ks-project: YOUR_PROJECT" \
  -H "Content-Type: application/json" \
  -d '{"query": "your test query"}'
```

## Troubleshooting

### Some Documents Failed

Check the `errors` array in the response:

```json
{
  "errors": [{ "documentId": "doc_123", "error": "Content too large" }]
}
```

Common causes:

- **Content too large**: Document exceeds 8191 tokens
- **Empty content**: Document has no text content
- **API error**: Transient OpenAI API failure

### Backfill Is Slow

Embedding speed depends on:

- OpenAI API latency (~100-300ms per request)
- Document size (larger = slower)
- Batch size (smaller = more API calls)

Tips:

- Run during off-peak hours
- Use appropriate batch size
- Consider running in stages

### Force Re-embed All

If you need to regenerate all embeddings (e.g., after changing embedding model):

```json
{
  "projectId": "YOUR_PROJECT",
  "forceRegenerate": true
}
```

This ignores content hash checks and re-embeds everything.

## Rollback Procedure

There's no automatic rollback. If needed, manually delete embeddings:

```sql
-- Delete embeddings for a project
DELETE FROM document_embeddings
WHERE "projectId" = 'YOUR_PROJECT';
```

## See Also

- [MCP Reference](../reference/api/mcp.md) - MCP tool documentation
- [Embedding Configuration](../reference/configuration/embedding.md) - Environment variables and settings
- [Cost Analysis](../explanation/concepts/embedding-costs.md) - Understanding embedding costs
- [Troubleshooting](../reference/troubleshooting/embedding.md) - Common embedding issues
