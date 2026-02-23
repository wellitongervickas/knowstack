[Home](../../index.md) > [Reference](../index.md) > [Configuration](index.md) > **Embedding**

# Embedding Reference

Environment variables for configuring semantic search for documents and instructions.

## Environment Variables

| Variable                          | Type    | Default                  | Description                           |
| --------------------------------- | ------- | ------------------------ | ------------------------------------- |
| `EMBEDDING_ENABLED`               | boolean | `true`                   | Enable/disable embedding feature      |
| `EMBEDDING_DEFAULT_PROVIDER`      | string  | `stub`                   | Embedding provider (`openai`, `stub`) |
| `OPENAI_EMBEDDING_MODEL`          | string  | `text-embedding-3-small` | OpenAI model for embeddings           |
| `EMBEDDING_TOP_K`                 | integer | `10`                     | Number of documents to retrieve       |
| `EMBEDDING_HYBRID_WEIGHT`         | float   | `0.7`                    | Semantic vs keyword weight (0-1)      |
| `EMBEDDING_RATE_LIMIT_PER_MINUTE` | integer | `60`                     | Rate limit for embedding operations   |
| `EMBEDDING_MAX_BATCH_SIZE`        | integer | `100`                    | Max batch size for backfill           |

## Detailed Configuration

### EMBEDDING_ENABLED

Controls whether the embedding feature is active.

```bash
EMBEDDING_ENABLED=true   # Enable semantic search (default)
EMBEDDING_ENABLED=false  # Disable, use all-docs retrieval
```

When disabled:

- Documents and instructions are not embedded
- Document queries use keyword-only search
- Instruction search uses keyword-only matching
- Existing embeddings are ignored

### EMBEDDING_DEFAULT_PROVIDER

Selects the embedding provider.

```bash
EMBEDDING_DEFAULT_PROVIDER=openai  # Production use
EMBEDDING_DEFAULT_PROVIDER=stub    # Development/testing
```

| Provider | Use Case   | Requirements              |
| -------- | ---------- | ------------------------- |
| `openai` | Production | `OPENAI_API_KEY` required |
| `stub`   | Testing    | No API key needed         |

### OPENAI_EMBEDDING_MODEL

Specifies the OpenAI embedding model.

```bash
OPENAI_EMBEDDING_MODEL=text-embedding-3-small  # Recommended
```

| Model                  | Dimensions | Cost            | Performance |
| ---------------------- | ---------- | --------------- | ----------- |
| text-embedding-3-small | 1536       | $0.02/1M tokens | 62.3% MTEB  |
| text-embedding-3-large | 3072       | $0.13/1M tokens | 64.6% MTEB  |

### EMBEDDING_TOP_K

Number of results to retrieve for each query (applies to both document and instruction search).

```bash
EMBEDDING_TOP_K=10   # Default, good balance
EMBEDDING_TOP_K=5    # Faster, less context
EMBEDDING_TOP_K=20   # More coverage, more tokens
```

Valid range: 1-50

### EMBEDDING_HYBRID_WEIGHT

Weight given to semantic (vector) search vs keyword search.

```bash
EMBEDDING_HYBRID_WEIGHT=0.7  # 70% semantic, 30% keyword (default)
EMBEDDING_HYBRID_WEIGHT=1.0  # 100% semantic only
EMBEDDING_HYBRID_WEIGHT=0.5  # Equal weighting
```

Higher values favor semantic matching (meaning). Lower values favor exact keyword matches.

### EMBEDDING_RATE_LIMIT_PER_MINUTE

Rate limit for embedding operations per project.

```bash
EMBEDDING_RATE_LIMIT_PER_MINUTE=60  # Default
```

Applies to document embedding, instruction embedding, and query embedding.

### EMBEDDING_MAX_BATCH_SIZE

Maximum items per batch during backfill operations (documents or instructions).

```bash
EMBEDDING_MAX_BATCH_SIZE=100  # Default, security limit
```

Prevents resource exhaustion during large backfills.

## Configuration Examples

### Development

```bash
EMBEDDING_ENABLED=true
EMBEDDING_DEFAULT_PROVIDER=stub
EMBEDDING_TOP_K=5
```

### Production (Cost-optimized)

```bash
EMBEDDING_ENABLED=true
EMBEDDING_DEFAULT_PROVIDER=openai
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_TOP_K=10
EMBEDDING_HYBRID_WEIGHT=0.7
```

### Production (High accuracy)

```bash
EMBEDDING_ENABLED=true
EMBEDDING_DEFAULT_PROVIDER=openai
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_TOP_K=20
EMBEDDING_HYBRID_WEIGHT=0.8
```

### Disable Semantic Search

```bash
EMBEDDING_ENABLED=false
```

## See Also

- [Semantic Retrieval Architecture](../../explanation/concepts/semantic-retrieval.md)
- [Cost Analysis](../../explanation/concepts/embedding-costs.md)
- [Troubleshooting](../troubleshooting/embedding.md)
