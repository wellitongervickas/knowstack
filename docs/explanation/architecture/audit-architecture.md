[Home](../../index.md) > [Explanation](../index.md) > [Architecture](index.md) > **Audit Architecture**

# Audit Logging Architecture

## Overview

The audit logging system is designed for reliability, performance, and security monitoring. This document explains the architectural decisions and how the components interact.

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────┐     │
│  │ DocService   │    │ QueryService │    │ InstructionSvc│     │
│  └──────┬───────┘    └──────┬───────┘    └──────┬────────┘     │
│         │                   │                    │                │
│         └───────────────────┼────────────────────┘                │
│                             ▼                                     │
│                   ┌─────────────────┐                            │
│                   │ AuditLogService │ (fire-and-forget)          │
│                   └────────┬────────┘                            │
│                            │                                      │
│         ┌──────────────────┼──────────────────┐                  │
│         ▼                  ▼                  ▼                   │
│  ┌────────────┐    ┌─────────────┐    ┌────────────┐            │
│  │ Sanitizer  │    │   Context   │    │  Cleanup   │            │
│  │            │    │  Enrichment │    │    Job     │            │
│  └────────────┘    └─────────────┘    └────────────┘            │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│                   ┌──────────────────┐                           │
│                   │ AuditLogRepo     │                           │
│                   └────────┬─────────┘                           │
│                            │                                      │
│                            ▼                                      │
│                   ┌──────────────────┐                           │
│                   │    PostgreSQL    │                           │
│                   │   (AuditLog)     │                           │
│                   └──────────────────┘                           │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Presentation Layer                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Audit logs are written internally by application services.       │
│  No dedicated read endpoints — logs are accessed via database.    │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

### AuditLogService

The central service for recording audit events.

**Responsibilities:**

- Accept audit log requests from application services
- Enrich with context (tenant, request)
- Sanitize metadata to remove sensitive data
- Persist to database using fire-and-forget pattern
- Never throw exceptions to calling code

**Key Methods:**

- `log(entry: AuditLogEntry): Promise<void>` - Main entry point

### MetadataSanitizer

Strips sensitive information from audit metadata.

**Responsibilities:**

- Remove known sensitive keys (passwords, tokens, secrets)
- Case-insensitive matching
- Deep object traversal
- Preserve audit-relevant information

**Sensitive Keys Removed:**

- `password`, `token`, `secret`
- `key`, `authorization`, `credential`

### AuditLogRepository

Data access layer for audit logs.

**Responsibilities:**

- Create audit log entries
- Query by organization with filters
- Delete expired entries (retention cleanup)
- Provide pagination

**Optimized Indexes:**

```sql
-- Actor queries
CREATE INDEX idx_audit_actor ON audit_log(actor_id, timestamp);

-- Subject queries (user self-access)
CREATE INDEX idx_audit_subject ON audit_log(subject_id, timestamp);

-- Resource lookup
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id);

-- Organization queries
CREATE INDEX idx_audit_org ON audit_log(organization_id, timestamp);

-- Filtered organization queries
CREATE INDEX idx_audit_org_category ON audit_log(organization_id, category, timestamp);

-- Retention cleanup
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp);
```

### Cleanup Job

Scheduled job for retention policy enforcement.

**Responsibilities:**

- Run on configurable interval (default: 24 hours)
- Delete logs older than retention period
- Process in batches to avoid long transactions
- Log cleanup statistics

**Flow:**

```
Timer Tick → Calculate Cutoff Date → Delete Batch → Repeat Until Done
```

### Audit Log Access

Audit logs are written internally by application services. In the current local-first architecture, there are no dedicated REST endpoints for querying audit logs. Logs can be accessed directly via the database for debugging and monitoring.

## Data Flow

### Write Path (Event Capture)

```
1. Service performs action (e.g., DocumentIngestionService.ingest)
         │
         ▼
2. Service calls auditLogService.log({...})
         │
         ▼
3. AuditLogService enriches with context
   - TenantContext (organizationId, projectId)
   - RequestContext (requestId)
         │
         ▼
4. MetadataSanitizer removes sensitive keys
         │
         ▼
5. Repository persists to database (async, no await)
         │
         ▼
6. Original service continues (fire-and-forget)
```

## Fire-and-Forget Pattern

The audit system uses fire-and-forget to ensure logging never impacts user operations.

### Implementation

```typescript
async log(entry: AuditLogEntry): Promise<void> {
  // Don't await - fire and forget
  this.repository.create(entry).catch((error) => {
    // Log error but don't throw
    this.logger.error('Failed to write audit log', error);
  });
}
```

### Trade-offs

**Pros:**

- Zero latency impact on main operations
- Main operation succeeds even if audit fails
- Better user experience

**Cons:**

- Small window where audit log might be lost (crash before write)
- No immediate feedback if audit fails

**Mitigation:**

- PostgreSQL durability ensures written logs survive crashes
- Error logging enables monitoring for audit failures
- Critical operations can use synchronous logging if needed

## Database Schema

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Actor (what performed the action)
  actor_id UUID,
  actor_type VARCHAR(20) NOT NULL,

  -- Action
  action VARCHAR(50) NOT NULL,
  category VARCHAR(20) NOT NULL,

  -- Resource
  resource_type VARCHAR(50),
  resource_id UUID,

  -- Context
  organization_id UUID,
  project_id UUID,
  ip_address VARCHAR(45),
  user_agent TEXT,
  request_id UUID,
  source VARCHAR(20),

  -- Extensible details
  metadata JSONB NOT NULL DEFAULT '{}'
);
```

## Performance Considerations

### Write Performance

- Fire-and-forget eliminates latency from main path
- Single INSERT per event (no transactions needed)
- JSONB metadata avoids schema changes

### Read Performance

- Composite indexes for common query patterns
- Pagination limits result set size
- Rate limiting prevents resource exhaustion
- Export endpoint limited to 10k records

### Storage

- 12-month retention limits growth
- Batch cleanup prevents table bloat
- JSONB compression for metadata
- Indexes sized for filtered queries

## Security Considerations

### Access Control

- Audit logs are write-only from application services
- No external read endpoints in local-first mode
- No UPDATE or DELETE endpoints exist

### Data Protection

- Metadata sanitization removes secrets
- No sensitive data in audit logs

### Immutability

- No modification APIs exposed
- Only retention cleanup deletes data
- Database-level immutability via application logic

## Monitoring

### Key Metrics

- Audit log write rate (events/second)
- Write failures (should be ~0)
- Query latency (p50, p95, p99)
- Rate limit hits
- Cleanup job execution time

### Alerting Recommendations

- Alert on write failure rate > 0.1%
- Alert on query latency p99 > 1s
- Alert on cleanup job failures
- Alert on rate limit spike

## See Also

- [Architecture Overview](overview.md)
- [Data Models](data-models.md)
