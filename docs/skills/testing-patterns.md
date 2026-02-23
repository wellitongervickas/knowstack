---
name: testing-patterns
description: Vitest testing patterns for TypeScript APIs following Clean Architecture. Use when writing unit tests, creating test factories, mocking repositories, or testing tenant isolation and CRUD operations.
---

# Testing Patterns

## Test Framework

- **Runner**: Vitest
- **Commands**: `pnpm test` (run all), `pnpm test:watch` (watch mode), `pnpm test:cov` (coverage)
- **File location**: `__tests__/` directory next to the source file

## File Naming

```
src/application/{domain}/services/__tests__/{domain}.service.spec.ts
src/presentation/mcp/handlers/__tests__/{domain}.handler.spec.ts
```

## Unit Test Structure

### Service Tests

Mock repository interfaces, test business logic:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('FeatureService', () => {
  let service: FeatureService;
  let mockRepository: {
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockRepository = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };
    service = new FeatureService(mockRepository as unknown as IFeatureRepository);
  });
});
```

### Test Helper Factory

Create reusable factory functions for test data:

```typescript
const createTestEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'entity-1',
  name: 'test',
  projectId: 'proj-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  ...overrides,
});
```

## Required Test Scenarios

### CRUD Operations
- Create with valid input
- Create with duplicate detection
- List with pagination (page, limit, totalPages)
- List with type/status filters
- Get by ID — found
- Get by ID — not found (throws domain exception)
- Update — partial update
- Update — name change with duplicate check
- Delete — success
- Delete — not found

### Tenant Isolation (Critical)
- Cross-project access returns 404, NOT 403
- Query always filters by `projectId`

```typescript
it('should throw NotFoundException for cross-project access (404 not 403)', async () => {
  const entity = createTestEntity({ projectId: 'proj-2' });
  mockRepository.findById.mockResolvedValue(entity);

  await expect(service.findById('proj-1', 'entity-1'))
    .rejects.toThrow(EntityNotFoundException);
});
```

### Error Handling
- Domain exceptions have correct error codes
- Not found returns `NotFoundException`
- Duplicates return `DuplicateException`

## Import Conventions

Always use `@/` path aliases in test files:

```typescript
// Correct
import { FeatureService } from '@/application/feature/services/feature.service';

// Wrong — will be blocked by pre-commit hook
import { FeatureService } from '../feature.service';
```

## See Also

- [Adding Features Guide](../contributing/adding-features.md)
- [Architecture Patterns](../explanation/architecture/patterns.md)
