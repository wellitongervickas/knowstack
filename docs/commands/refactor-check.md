---
name: refactor-check
description: Refactoring safety checklist
---

# Refactoring Safety Checklist

## Before Starting

- [ ] All tests pass: `pnpm test`
- [ ] No uncommitted changes: `git status`
- [ ] Create a branch for the refactor
- [ ] Identify the scope — which files/modules will change?
- [ ] Check if the code being refactored has existing tests

## During Refactoring

### Structural Changes

- [ ] Maintain Clean Architecture layer boundaries
- [ ] Dependencies still point inward (Core <- Application <- Infrastructure <- Presentation)
- [ ] No new circular dependencies introduced
- [ ] Symbol tokens remain in `core/interfaces/` files
- [ ] Module registrations updated if providers moved

### Renaming

- [ ] Update all import paths (use IDE rename, then verify with `pnpm typecheck`)
- [ ] Update barrel exports (`index.ts`) if applicable
- [ ] Update module provider/controller arrays
- [ ] Update test files
- [ ] No broken `@/` import paths

### Extracting

- [ ] Extracted code has clear single responsibility
- [ ] Shared utilities go in `@/common/utils/`
- [ ] Domain-specific helpers stay in their domain folder
- [ ] Don't extract for hypothetical reuse — only for actual duplication (3+ occurrences)

### Inlining

- [ ] Remove unused abstractions
- [ ] Clean up barrel exports
- [ ] Remove empty files/directories
- [ ] No "backwards compatibility" re-exports for removed code

## After Refactoring

- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm test` — all tests pass (no regressions)
- [ ] `pnpm lint` — no new lint errors
- [ ] No unused imports or dead code
- [ ] Documentation still accurate (update if needed)

## Red Flags

- Refactor introduces new abstractions for single-use code
- Refactor changes public API contracts
- Refactor touches files unrelated to the stated goal
- Refactor breaks existing tests (may indicate behavioral change, not just structural)
- Adding `// @ts-ignore` or `any` casts to make things compile

## See Also

- [Architecture Patterns](../explanation/architecture/patterns.md)
- [Code Review Command](code-review.md)
- [Adding Features Guide](../contributing/adding-features.md)
