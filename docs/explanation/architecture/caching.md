[Home](../../index.md) > [Explanation](../index.md) > [Architecture](index.md) > **Caching**

# Caching and Performance

KnowStack API uses Redis to cache query responses, reducing latency and AI provider costs.

## Features

### Response Caching

Identical queries return cached responses instantly without calling the AI provider.

**Benefits:**

- Reduced latency (milliseconds vs. seconds)
- Lower OpenAI API costs
- Graceful degradation (cache failures don't break queries)

**Response:**

```json
{
  "answer": "...",
  "meta": {
    "provider": "openai",
    "model": "gpt-4o-mini",
    "latencyMs": 15,
    "requestId": "550e8400-e29b-41d4-a716-446655440000",
    "cacheHit": true
  }
}
```

### Cache Key Strategy

Keys are scoped by project and include a hash of the query parameters:

```
ks:query:{projectId}:{sha256(query + context + documentsHash)}
```

| Component     | Description                              |
| ------------- | ---------------------------------------- |
| `ks`          | KnowStack namespace prefix               |
| `query`       | Cache type identifier                    |
| `projectId`   | Project isolation                        |
| `sha256(...)` | Hash of query + context + document state |

The `documentsHash` changes automatically when documents are added, removed, or updated.

### Cache Invalidation

Cache is invalidated when documents change:

```
┌───────────────────────────────┐
│ Document created/updated/deleted │
└───────────────────────────────┘
              │
              ▼
┌───────────────────────────────┐
│ CacheInvalidationService      │
│ .invalidateProjectCache()     │
└───────────────────────────────┘
              │
              ▼
┌───────────────────────────────┐
│ Redis SCAN + DEL              │
│ pattern: ks:query:{projectId}:* │
└───────────────────────────────┘
              │
              ▼
    All cached queries removed
```

### Cache Metrics

Cache hit/miss counts are tracked internally via `IMetricsService` for logging and debugging.

## Architecture

### Components

```
src/
├── core/interfaces/services/
│   └── cache.interface.ts              # ICacheService interface
├── common/utils/
│   └── cache-key.util.ts               # Cache key generation
├── application/
│   ├── query/services/
│   │   └── query-orchestrator.service.ts  # Cache check/store
│   └── cache/services/
│       └── cache-invalidation.service.ts  # Project cache invalidation
└── infrastructure/
    ├── config/
    │   └── redis.config.ts             # Redis configuration
    └── cache/
        ├── cache.module.ts             # Global cache module
        └── services/
            ├── redis.service.ts        # ICacheService implementation
            └── noop-cache.service.ts   # No-op for testing
```

### Query Lifecycle

```
        Query Request
              │
              ▼
┌─────────────────────────────┐
│  Fetch Documents            │
│  (get documents for project)│
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Generate Cache Key         │
│  (hash query + documents)   │
└─────────────────────────────┘
              │
              ▼
┌─────────────────────────────┐
│  Check Cache                │
└─────────────────────────────┘
         │         │
    [HIT]│         │[MISS]
         │         │
         ▼         ▼
   Return      ┌─────────────────────────────┐
   cached      │  Build AI Prompt            │
   response    │  (create messages from docs)│
   (cacheHit:  └─────────────────────────────┘
    true)                   │
                           ▼
               ┌─────────────────────────────┐
               │  Call AI Provider           │
               │  (OpenAI/Anthropic/Stub)    │
               └─────────────────────────────┘
                           │
                           ▼
               ┌─────────────────────────────┐
               │  Cache Response             │
               │  (fire-and-forget store)    │
               └─────────────────────────────┘
                           │
                           ▼
               Query Response (cacheHit: false)
```

## Configuration

| Variable                  | Default                  | Description           |
| ------------------------- | ------------------------ | --------------------- |
| `REDIS_URL`               | `redis://localhost:6379` | Redis connection URL  |
| `REDIS_CACHE_TTL_SECONDS` | `3600`                   | Cache TTL (1 hour)    |
| `REDIS_CACHE_ENABLED`     | `true`                   | Toggle caching on/off |

## Usage Examples

### Docker Compose

Redis is included in `docker-compose.yml`:

```bash
docker-compose up -d
docker-compose exec redis redis-cli ping
# PONG
```

### Testing Cache Behavior

Cache behavior is transparent to MCP clients. The `knowstack_query` tool returns cached responses automatically when available. Cache hits are visible via the `cacheHit` field in query responses and in Prometheus metrics.

## Known Limitations

| Limitation              | Description                                     |
| ----------------------- | ----------------------------------------------- |
| SCAN-based invalidation | O(N) for projects with many cached queries      |
| TTL-based freshness     | Cached responses may be stale up to TTL seconds |
| No cache warming        | First query after invalidation always calls AI  |
| Single Redis instance   | No clustering/HA in current implementation      |

## Future Enhancements (Scaffolded)

The following are prepared but not implemented:

- **Per-user rate limiting**: Use `incr()` for request counting
- **Cache warming**: Pre-populate cache on document ingestion
- **Background invalidation**: Queue-based cache invalidation

See `src/core/interfaces/services/cache.interface.ts` for available methods (`incr`, `expire`).

## See Also

- [Architecture Overview](overview.md)
- [Observability](observability.md)
- [MCP API Reference](../../reference/api/mcp.md)
