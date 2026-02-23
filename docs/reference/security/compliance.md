[Home](../../index.md) > [Reference](../index.md) > [Security](index.md) > **Security Controls**

# Security Controls

## Overview

KnowStack provides built-in security controls that help protect your data when self-hosting. This page summarizes the available controls and their implementation status.

## Controls in Place

| Control Area          | Implementation                                          |
| --------------------- | ------------------------------------------------------- |
| Encryption in Transit | TLS 1.2+                                                |
| Tenant Isolation      | Config-header resolution with database FK constraints   |
| Audit Logging         | Comprehensive event logging (configurable retention)    |
| Security Headers      | X-Data-Privacy, X-Content-Type-Options, HSTS, etc.      |

## Data Protection Measures

- Data encryption in transit (TLS 1.2+)
- Tenant isolation via config headers and database constraints
- Audit logging for data access
- Security headers on all responses

## See Also

- [Security Whitepaper](../../explanation/security/whitepaper.md)
- [AI Data Policy](ai-data-policy.md)
