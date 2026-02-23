[Home](../../index.md) > [Reference](../index.md) > [Configuration](index.md) > **Audit**

# Audit Reference

Environment variables for configuring the audit logging system.

## Environment Variables

| Variable                        | Type    | Default    | Description                      |
| ------------------------------- | ------- | ---------- | -------------------------------- |
| `AUDIT_LOG_ENABLED`             | boolean | `false`    | Enable or disable audit logging  |
| `AUDIT_LOG_RETENTION_DAYS`      | number  | `365`      | Days to retain audit logs        |
| `AUDIT_LOG_CLEANUP_INTERVAL_MS` | number  | `86400000` | Cleanup job interval (ms)        |
| `AUDIT_LOG_BATCH_DELETE_SIZE`   | number  | `1000`     | Batch size for retention cleanup |
| `AUDIT_LOG_EXPORT_MAX_LIMIT`    | number  | `10000`    | Maximum records per export       |

## Detailed Configuration

### AUDIT_LOG_ENABLED

Controls whether audit events are recorded.

```bash
AUDIT_LOG_ENABLED=true
```

**Values:**

- `true` - Audit logging is active
- `false` - Audit logging is disabled (default)

**Notes:**

- Set to `false` in development to reduce database writes
- Set to `true` in production for security monitoring
- When disabled, no audit events are recorded

### AUDIT_LOG_RETENTION_DAYS

Number of days to retain audit log entries before automatic deletion.

```bash
AUDIT_LOG_RETENTION_DAYS=365
```

**Default:** `365` (12 months)

**Configuration Guidelines:**

| Use Case | Recommended Retention                    |
| -------- | ---------------------------------------- |
| Standard | 12 months                                |
| Extended | 6 years (stricter audit requirements)    |
| Minimal  | 30 days (development environments)       |

**Notes:**

- Logs older than this value are deleted by the cleanup job
- Increase for stricter audit requirements (set to `2190` for 6 years)
- Decrease for development environments (e.g., `30` days)

### AUDIT_LOG_CLEANUP_INTERVAL_MS

How often the retention cleanup job runs, in milliseconds.

```bash
AUDIT_LOG_CLEANUP_INTERVAL_MS=86400000
```

**Default:** `86400000` (24 hours)

**Common Values:**

| Interval | Value       |
| -------- | ----------- |
| 1 hour   | `3600000`   |
| 6 hours  | `21600000`  |
| 12 hours | `43200000`  |
| 24 hours | `86400000`  |
| 7 days   | `604800000` |

**Notes:**

- Lower values keep the table smaller but increase database load
- Higher values reduce load but may leave more expired data
- The cleanup job is idempotent and safe to run frequently

### AUDIT_LOG_BATCH_DELETE_SIZE

Number of records to delete per batch during retention cleanup.

```bash
AUDIT_LOG_BATCH_DELETE_SIZE=1000
```

**Default:** `1000`

**Trade-offs:**

| Batch Size         | Pros                           | Cons                                  |
| ------------------ | ------------------------------ | ------------------------------------- |
| Small (100-500)    | Lower lock time, gentler on DB | Slower overall cleanup                |
| Medium (1000-5000) | Good balance                   | Standard choice                       |
| Large (10000+)     | Faster cleanup                 | Longer transactions, higher lock time |

**Notes:**

- Larger batches are faster but hold locks longer
- Smaller batches are gentler on concurrent operations
- Adjust based on your database capacity and traffic patterns

### AUDIT_LOG_EXPORT_MAX_LIMIT

Maximum number of records returned by the export endpoint.

```bash
AUDIT_LOG_EXPORT_MAX_LIMIT=10000
```

**Default:** `10000`

**Notes:**

- Prevents excessive memory usage during export
- Users needing more records should use date range filters
- Consider your server memory when increasing this value
- Large exports can take significant time; rate limiting helps

## Configuration Examples

### Development

```bash
# Minimal audit logging for development
AUDIT_LOG_ENABLED=false
AUDIT_LOG_RETENTION_DAYS=30
AUDIT_LOG_CLEANUP_INTERVAL_MS=3600000
AUDIT_LOG_BATCH_DELETE_SIZE=500
AUDIT_LOG_EXPORT_MAX_LIMIT=1000
```

### Production (Standard)

```bash
# Standard 12-month retention
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=365
AUDIT_LOG_CLEANUP_INTERVAL_MS=86400000
AUDIT_LOG_BATCH_DELETE_SIZE=1000
AUDIT_LOG_EXPORT_MAX_LIMIT=10000
```

### Production (Extended Retention)

```bash
# 6-year retention for stricter audit requirements
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=2190
AUDIT_LOG_CLEANUP_INTERVAL_MS=86400000
AUDIT_LOG_BATCH_DELETE_SIZE=2000
AUDIT_LOG_EXPORT_MAX_LIMIT=10000
```

### High-Volume Production

```bash
# For high-traffic deployments
AUDIT_LOG_ENABLED=true
AUDIT_LOG_RETENTION_DAYS=365
AUDIT_LOG_CLEANUP_INTERVAL_MS=21600000  # Every 6 hours
AUDIT_LOG_BATCH_DELETE_SIZE=5000
AUDIT_LOG_EXPORT_MAX_LIMIT=50000
```

## Validation

After configuring, verify settings are loaded by checking the application logs on startup. When audit logging is enabled, the service will log:

```
INFO: Audit logging enabled (retention: 365 days)
```

## See Also

- [Audit Architecture](../../explanation/architecture/audit-architecture.md) - How audit logging works internally
- [Observability](../../explanation/architecture/observability.md) - Logging and monitoring
