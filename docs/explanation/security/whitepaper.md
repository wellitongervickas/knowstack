[Home](../../index.md) > [Explanation](../index.md) > [Security](index.md) > **Security Whitepaper**

# Security Whitepaper

## Executive Summary

KnowStack is a multi-tenant developer documentation platform built for teams handling sensitive intellectual property. This document describes the security architecture and key design decisions.

All security claims are verified against implementation source code with file:line references.

### Key Guarantees

- **No AI Training**: User data is never used for AI model training
- **Tenant Isolation**: Config-driven tenant resolution with database-enforced boundaries
- **Audit Trail**: Comprehensive audit logging for security monitoring and forensics

---

## Security Architecture

```
+------------------------------------------------------------------+
|                      REQUEST LAYER                                |
|  Security Headers (X-Data-Privacy, X-Content-Type-Options, etc.) |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                  TENANT RESOLUTION LAYER                          |
|  Config headers (x-ks-org, x-ks-project)                        |
|  ConfigTenantMiddleware resolves slugs to IDs                    |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                  APPLICATION LAYER                                |
|  All queries scoped to resolved tenant context                   |
+------------------------------------------------------------------+
                              |
+------------------------------------------------------------------+
|                  STORAGE LAYER                                    |
|  PostgreSQL with foreign key constraints and audit log tables    |
+------------------------------------------------------------------+
```

---

## Tenant Isolation

### Config-Header Approach

KnowStack uses a local-first, config-driven approach to tenant resolution:

1. Every request includes `x-ks-org` and `x-ks-project` headers
2. `ConfigTenantMiddleware` resolves slugs to database IDs
3. All subsequent queries are scoped to the resolved tenant context
4. Database foreign keys enforce referential integrity

This model is designed for self-hosted, trusted-network deployments where authentication is handled upstream or unnecessary.

---

## AI Data Policy

- User data is **never** used for AI model training by KnowStack
- OpenAI API data is not used for training by default
- Default data retention: 30 days (OpenAI default)
- Zero data retention eligible with OpenAI enterprise agreement and organization opt-in

See [AI Data Policy](../../reference/security/ai-data-policy.md) for full details.

---

## Audit Logging

All security-relevant events are logged with:

- Action type and category
- Affected resource
- Timestamp
- Request context
- Organization and project scope

Retention: 365 days (configurable). Logs are immutable once written.

See [Security Controls](../../reference/security/compliance.md) for full details.

---

## Security Headers

All API responses include security headers, including error responses:

| Header                    | Value                               | Purpose                       |
| ------------------------- | ----------------------------------- | ----------------------------- |
| X-Data-Privacy            | no-ai-training                      | Data not used for AI training |
| X-Content-Type-Options    | nosniff                             | Prevents MIME sniffing        |
| X-Frame-Options           | DENY                                | Prevents clickjacking         |
| Strict-Transport-Security | max-age=31536000; includeSubDomains | Enforces HTTPS                |

---

## See Also

- [AI Data Policy](../../reference/security/ai-data-policy.md)
- [Security Controls](../../reference/security/compliance.md)
