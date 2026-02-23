---
name: code-review
description: Code review checklist for pull requests
---

# Code Review Checklist

## Architecture

- [ ] Follows Clean Architecture layer separation
- [ ] Dependencies point inward (Core <- Application <- Infrastructure <- Presentation)
- [ ] DI uses Symbol tokens defined in `core/interfaces/`
- [ ] No circular dependencies
- [ ] New modules registered in `app.module.ts`

## Code Quality

- [ ] All imports use `@/` paths — no relative `../` imports
- [ ] No magic values — uses constants from `app.constants.ts` or `{domain}.constants.ts`
- [ ] No `process.env` outside `app.settings.ts`
- [ ] DTOs contain only data shapes and static mappers
- [ ] Business logic is in services, not controllers or DTOs
- [ ] No unused imports or dead code

## Security

- [ ] Tenant isolation enforced — every query filters by `projectId` or `organizationId`
- [ ] Cross-tenant access returns 404, not 403
- [ ] MCP handlers resolve tenant via config headers (`x-ks-org`, `x-ks-project`)
- [ ] No sensitive data in error messages or logs
- [ ] Input validation on all DTO fields via `class-validator`
- [ ] Zod schemas validate MCP tool inputs
- [ ] String fields have `@MaxLength()` to prevent abuse

## Database

- [ ] Prisma schema changes have migration
- [ ] Foreign keys indexed
- [ ] JSON fields cast properly (`as Prisma.InputJsonValue` on write, with `?? {}` on read)
- [ ] Repository maps Prisma models to domain entities

## Testing

- [ ] Unit tests for service logic
- [ ] Tenant isolation tested (cross-project returns 404)
- [ ] Duplicate detection tested
- [ ] Edge cases covered (empty results, boundary values)
- [ ] No flaky tests or hardcoded dates
- [ ] Tests use `@/` import paths

## Documentation

- [ ] API reference updated in `docs/reference/api/`
- [ ] Constants documented in `docs/reference/configuration/constants.md`
- [ ] Breadcrumbs at top of new doc files
- [ ] "See Also" section at bottom of new doc files
- [ ] New docs added to parent `index.md`

## See Also

- [Architecture Patterns](../explanation/architecture/patterns.md)
- [Adding Features Guide](../contributing/adding-features.md)
