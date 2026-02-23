[Home](../../index.md) > [Reference](../index.md) > [Configuration](index.md) > **Settings**

# Settings Reference

Environment-configurable values parsed from `process.env`.

## Location

All settings are defined in `@/app.settings` and can be overridden via `.env` file.

## Application

| Setting       | Env Variable  | Default         | Description                                                |
| ------------- | ------------- | --------------- | ---------------------------------------------------------- |
| `NODE_ENV`    | `NODE_ENV`    | `'development'` | Environment mode                                           |
| `TRUST_PROXY` | `TRUST_PROXY` | `false`         | Trust X-Forwarded-For header (enable behind reverse proxy) |
| `PORT`        | `PORT`        | `3000`          | HTTP server port                                           |

## Database

| Setting        | Env Variable   | Default              | Description               |
| -------------- | -------------- | -------------------- | ------------------------- |
| `DATABASE_URL` | `DATABASE_URL` | `'postgresql://...'` | PostgreSQL connection URL |

## Redis

| Setting                   | Env Variable              | Default                    | Description                |
| ------------------------- | ------------------------- | -------------------------- | -------------------------- |
| `REDIS_URL`               | `REDIS_URL`               | `'redis://localhost:6379'` | Redis connection URL       |
| `REDIS_CACHE_TTL_SECONDS` | `REDIS_CACHE_TTL_SECONDS` | `3600`                     | Default cache TTL (1 hour) |
| `REDIS_CACHE_ENABLED`     | `REDIS_CACHE_ENABLED`     | `true`                     | Enable/disable caching     |

## AI Providers

| Setting                  | Env Variable             | Default          | Description         |
| ------------------------ | ------------------------ | ---------------- | ------------------- |
| `AI_DEFAULT_PROVIDER`    | `AI_DEFAULT_PROVIDER`    | `'stub'`         | Default provider    |
| `OPENAI_API_KEY`         | `OPENAI_API_KEY`         | `''`             | OpenAI API key      |
| `OPENAI_MODEL`           | `OPENAI_MODEL`           | `'gpt-4.1-mini'` | OpenAI model        |
| `AI_MAX_RESPONSE_TOKENS` | `AI_MAX_RESPONSE_TOKENS` | `4096`           | Max response tokens |
| `APP_BASE_URL`           | `APP_BASE_URL`           | `''`             | Application base URL |

## Embedding & Semantic Search

| Setting                          | Env Variable                     | Default                    | Description                    |
| -------------------------------- | -------------------------------- | -------------------------- | ------------------------------ |
| `EMBEDDING_ENABLED`              | `EMBEDDING_ENABLED`              | `true`                     | Enable/disable embeddings      |
| `EMBEDDING_DEFAULT_PROVIDER`     | `EMBEDDING_DEFAULT_PROVIDER`     | `'stub'`                   | Embedding provider             |
| `OPENAI_EMBEDDING_MODEL`         | `OPENAI_EMBEDDING_MODEL`         | `'text-embedding-3-small'` | OpenAI embedding model         |
| `EMBEDDING_TOP_K`                | `EMBEDDING_TOP_K`                | `10`                       | Top-K for semantic search      |
| `EMBEDDING_HYBRID_WEIGHT`        | `EMBEDDING_HYBRID_WEIGHT`        | `0.7`                      | Semantic vs keyword weight     |
| `EMBEDDING_RATE_LIMIT_PER_MINUTE`| `EMBEDDING_RATE_LIMIT_PER_MINUTE`| `60`                       | Rate limit per minute          |
| `EMBEDDING_MAX_BATCH_SIZE`       | `EMBEDDING_MAX_BATCH_SIZE`       | `100`                      | Max backfill batch size        |

## Audit Logging

| Setting                        | Env Variable                   | Default    | Description                |
| ------------------------------ | ------------------------------ | ---------- | -------------------------- |
| `AUDIT_LOG_ENABLED`            | `AUDIT_LOG_ENABLED`            | `false`    | Enable/disable audit logs  |
| `AUDIT_LOG_RETENTION_DAYS`     | `AUDIT_LOG_RETENTION_DAYS`     | `365`      | Retention period (days)    |
| `AUDIT_LOG_CLEANUP_INTERVAL_MS`| `AUDIT_LOG_CLEANUP_INTERVAL_MS`| `86400000` | Cleanup interval (ms)      |
| `AUDIT_LOG_BATCH_DELETE_SIZE`  | `AUDIT_LOG_BATCH_DELETE_SIZE`  | `1000`     | Batch delete size          |
| `AUDIT_LOG_EXPORT_MAX_LIMIT`  | `AUDIT_LOG_EXPORT_MAX_LIMIT`  | `10000`    | Max export entries         |

## Usage

```typescript
import { REDIS_URL, AI_DEFAULT_PROVIDER } from '@/app.settings';

// Settings are pre-parsed from process.env
console.log(REDIS_URL); // 'redis://localhost:6379'
```

## Environment File Example

See `.env.example` for a complete template with all variables.

## See Also

- [Constants Reference](constants.md) - Static configuration values
- [Quick Start](../../tutorials/quick-start.md) - Setting up environment
