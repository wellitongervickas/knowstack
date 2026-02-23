# KnowStack API

Complete project documentation `docs/index.md`

## Commands

Package manager is **pnpm** (not npm/yarn). check `package.json`.

### Common commands

- `pnpm build` — compile
- `pnpm test` — run tests (vitest)
- `pnpm typecheck` — `tsc --noEmit`
- `pnpm lint` — lint and fix
- `pnpm format:check` — check formatting
- `pnpm start:dev` — dev server

## Workflow: Template-Driven Development (via MCP)

**BEFORE writing any code**, follow the Planner agent workflow using MCP templates:

1. **Refine** — `knowstack.get_templates(name: 'prompt')` → refine raw input into a structured prompt
2. **Structure** — `knowstack.get_templates(name: 'request')` → build a formal request (GOLDEN framework)
3. **Plan** — `knowstack.get_templates(name: 'plan')` → generate phased execution plan
4. **Persist** — `knowstack.save_memory(name: 'plan-{id}')` → save plan for cross-phase context
5. **Implement** following the plan phases
6. **Run verification** — `pnpm typecheck && pnpm build && pnpm test`
7. **Write documentation** — every endpoint change needs `docs/reference/api/` update. See `docs/contributing/documentation.md` for breadcrumb format, "See Also" requirements, and index.md updates.

Use `knowstack.get_agents(name: 'planner')` for the full workflow guide. If no request exists for the task, ask the user before proceeding.

## Required Reading Before Coding

You MUST read these before writing implementation code. They contain all coding standards, patterns, and conventions for this project.

**Always read:**

- `docs/explanation/architecture/patterns.md` — DI with Symbols, decorators, imports, constants vs settings, coding standards
- `docs/contributing/adding-features.md` — step-by-step feature implementation checklist

**Read for context:**

- `docs/explanation/architecture/overview.md` — layer rules, folder structure, dependency direction, "put here / don't put here"
- `docs/contributing/documentation.md` — Diataxis framework, breadcrumbs, "See Also" sections, index updates
- `docs/reference/configuration/constants.md` — full table of all existing constants by scope
- `docs/reference/configuration/settings.md` — full table of all env-configurable settings

**Read when relevant:**

- `docs/explanation/concepts/rbac.md` — role hierarchy, permission decorators (auth features)
- `docs/explanation/concepts/multi-tenancy.md` — tenant isolation, request-scoped context (data access features)

Always look at an existing similar feature in `src/` before creating new code.

## Pre-Submit Checklist

Check each one before submitting code. These are recurring violations — all are documented in `docs/explanation/architecture/patterns.md`.

1. **Wrong package manager** — `pnpm`, never `npm` or `yarn`
2. **Relative imports** — `@/` paths only (mapped to `src/` in tsconfig). Never `../../../`
3. **Magic values** — use `app.constants.ts` (global) or `{domain}.constants.ts` (module-specific). Check `docs/reference/configuration/constants.md` for existing ones before creating new ones
4. **`process.env` in code** — all env access goes through `app.settings.ts` only. See `docs/reference/configuration/settings.md`
5. **Logic in DTOs** — DTOs are data shapes + static mappers only. Business logic, filtering, pagination, utilities belong in services
6. **Interfaces in wrong place** — Symbol tokens and repository interfaces go in `core/interfaces/`, never in service or implementation files. Import from source, not through re-exports
7. **Raw NestJS exceptions** — use custom exceptions from `core/exceptions/`. Check existing ones first
8. **String literals for categorical values** — use or create enums in `*.constants.ts`. Check existing enums in the codebase before creating new ones
9. **Tenant isolation missing** — every data query must filter by `projectId` or `organizationId`. Use `TenantContextService` in services or `@Tenant()` in controllers
10. **Missing documentation** — changes would need: `docs/**/*.md` update, references, explanation, architecture, breadcrumb at top, "See Also" at bottom, entry in parent `index.md`, check what need to be created/updated `docs/contributing/documentation.md`
11. **Fire-and-forget throws** — async side-effects (audit, cache, tracking) must `.catch()` and log, never throw to caller
