---
name: dependency-check
description: Dependency review and update checklist
---

# Dependency Check

## Before Adding a Dependency

- [ ] Is this dependency truly needed? Can the feature be implemented with existing deps or stdlib?
- [ ] Check package size — prefer lightweight alternatives
- [ ] Check maintenance status — last publish date, open issues, bus factor
- [ ] Check license compatibility (ISC, MIT, Apache-2.0 preferred)
- [ ] Check for known vulnerabilities: `pnpm audit`
- [ ] Prefer `devDependencies` for build/test-only packages

## Current Dependency Categories

### Runtime (`dependencies`)

| Category | Package | Purpose |
|----------|---------|---------|
| Framework | `@nestjs/*` | HTTP server, DI, config |
| Database | `@prisma/client` | ORM and query builder |
| Validation | `class-validator`, `class-transformer` | DTO validation |
| AI | `openai` | Embedding generation |
| MCP | `@modelcontextprotocol/sdk` | MCP server protocol |
| Schema | `zod` | MCP tool input validation |
| Cache | `ioredis` | Redis client for caching |
| Utility | `dotenv`, `reflect-metadata`, `rxjs` | Runtime support |

### Dev (`devDependencies`)

| Category | Package | Purpose |
|----------|---------|---------|
| Testing | `vitest`, `@vitest/coverage-v8`, `supertest` | Test runner, coverage |
| CLI | `@clack/prompts` | Interactive setup scripts |
| TypeScript | `typescript`, `ts-node`, `tsconfig-paths` | Compilation |
| Linting | `eslint`, `prettier`, related plugins | Code style |

## Update Workflow

```bash
# Check for outdated packages
pnpm outdated

# Update a specific package
pnpm update <package-name>

# Update all (minor + patch)
pnpm update

# After updates
pnpm typecheck && pnpm build && pnpm test
```

## Rules

- **Package manager**: Always `pnpm`, never `npm` or `yarn`
- **Lock file**: Always commit `pnpm-lock.yaml`
- **Peer deps**: Resolve peer dependency warnings before merging
- **Major upgrades**: Test thoroughly — check changelog for breaking changes
- **Prisma**: After updating `prisma`/`@prisma/client`, run `pnpm prisma generate`

## See Also

- [Development Setup](../contributing/setup.md)
- [Configuration Reference](../reference/configuration/index.md)
