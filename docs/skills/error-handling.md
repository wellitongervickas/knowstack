---
name: error-handling
description: Custom exception hierarchy and error handling patterns. Use when creating domain exceptions, handling errors in services, implementing tenant isolation via 404, or writing fire-and-forget async operations.
---

# Error Handling

## Exception Hierarchy

All domain exceptions extend `DomainException`:

```
DomainException (base)
  +- EntityNotFoundException (404)
  +- DuplicateEntityException (409)
  +- ValidationException (400)
```

## Creating Domain Exceptions

Each domain defines its own exceptions in `src/core/exceptions/`:

```typescript
import { DomainException } from '@/core/exceptions/domain.exception';

export class InstructionNotFoundException extends DomainException {
  constructor() {
    super('INSTRUCTION_NOT_FOUND', 'Instruction not found', 404);
  }
}

export class InstructionDuplicateException extends DomainException {
  constructor() {
    super(
      'INSTRUCTION_DUPLICATE',
      'An instruction with this name and type already exists',
      409,
    );
  }
}
```

## Error Response Format

The global exception filter transforms domain exceptions into:

```json
{
  "error": {
    "code": "INSTRUCTION_NOT_FOUND",
    "message": "Instruction not found",
    "statusCode": 404
  }
}
```

## Rules

### Do

- Create specific exceptions per domain (e.g., `InstructionNotFoundException`)
- Use error codes in UPPER_SNAKE_CASE
- Keep error messages user-friendly — no internal IDs or stack traces
- Export exceptions from `src/core/exceptions/index.ts`
- Use 404 for cross-tenant access (not 403) to prevent information leakage

### Don't

- Never throw raw NestJS exceptions (`NotFoundException`, `BadRequestException`)
- Never include entity IDs in exception messages
- Never expose internal errors to clients
- Never use `throw` in fire-and-forget async operations — use `.catch()` and log

## Tenant Isolation via 404

Cross-project access intentionally returns 404 instead of 403:

```typescript
async findById(projectId: string, id: string): Promise<Entity> {
  const entity = await this.repository.findById(id);
  // 404 hides existence of resources in other tenants
  if (!entity || entity.projectId !== projectId) {
    throw new EntityNotFoundException();
  }
  return entity;
}
```

## Fire-and-Forget Pattern

Async side-effects (audit, cache, tracking) must catch errors:

```typescript
// Correct — catch and log
this.auditService.log(event).catch((err) => this.logger.error('Audit failed', err));

// Wrong — unhandled rejection will crash
this.auditService.log(event);
```

## See Also

- [Architecture Patterns](../explanation/architecture/patterns.md)
- [Security Whitepaper](../explanation/security/whitepaper.md)
- [Troubleshooting Errors](../reference/troubleshooting/errors.md)
