[Home](../../index.md) > [Explanation](../index.md) > [Concepts](index.md) > **Multi-tenancy**

# Multi-tenancy

How KnowStack isolates data between organizations.

## Overview

KnowStack is a self-hostable, multi-tenant platform where each organization's data is completely isolated from others. This document explains the isolation strategy.

## Tenant Model

The **organization** is the top-level tenant boundary:

```
Organization A                Organization B
├── Projects                  ├── Projects
│   ├── Documents            │   ├── Documents
│   └── Instructions         │   └── Instructions
└── Audit Logs               └── Audit Logs
```

All data belongs to exactly one organization. There is no shared data between tenants.

---

## Isolation Mechanisms

### 1. Config-Header Tenant Resolution

Every request includes tenant context via HTTP headers:

```
x-ks-org: org-slug → Organization
x-ks-project: project-slug → Project
```

When a request arrives:

1. The `ConfigTenantMiddleware` reads `x-ks-org` and `x-ks-project` headers
2. Slugs are resolved to organization and project IDs via database lookup
3. All subsequent operations are scoped to that organization and project

### 2. Database Constraints

Foreign keys ensure data integrity:

- Projects must belong to an organization
- Documents must belong to a project
- Instructions are scoped to a project or organization

---

## Request-Scoped Context

KnowStack uses `nestjs-cls` (AsyncLocalStorage) to maintain tenant context throughout a request:

```typescript
// Set by ConfigTenantMiddleware
tenantContext.setContext({
  organization: { id, slug },
  project: { id, slug },
});

// Available anywhere in the request lifecycle
const orgId = tenantContext.getOrganizationId();
```

This ensures:

- No accidental cross-tenant data access
- Consistent context for logging and audit
- Clean separation of concerns

---

## Data Access Patterns

### MCP Tool Execution

```
Request with x-ks-org + x-ks-project headers
    ↓
ConfigTenantMiddleware resolves slugs to IDs
    ↓
TenantContext set (org + project)
    ↓
MCP tool executes with project scope
    ↓
DocumentService.getByProjectId(projectId)  // Only project's docs
    ↓
AI generates answer
```

---

## Benefits

| Benefit            | Description                            |
| ------------------ | -------------------------------------- |
| **Security**       | Data cannot leak between organizations |
| **Data isolation** | Clear data ownership boundaries        |
| **Simplicity**     | No auth infrastructure needed          |
| **Scaling**        | Organizations can be sharded if needed |

---

## See Also

- [Architecture Overview](../architecture/overview.md) - System design
- [Data Models](../architecture/data-models.md) - Entity relationships
