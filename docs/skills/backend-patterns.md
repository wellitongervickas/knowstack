---
name: backend-patterns
description: NestJS + Clean Architecture patterns for KnowStack backend. Use when creating new services, modules, MCP handlers, implementing features, or following layer rules and DI conventions.
---

# Backend Patterns

## Architecture

- **Clean Architecture**: Core -> Application -> Infrastructure -> Presentation
- **DI with Symbols**: Define interfaces + Symbol tokens in `core/interfaces/`, inject via `@Inject(SYMBOL)`
- **Repository Pattern**: Abstract data access behind interfaces, implement with Prisma

## Layer Rules

| Layer | Depends On | Contains |
|-------|-----------|----------|
| Core | Nothing | Entities, interfaces, exceptions |
| Application | Core | Services, DTOs, constants |
| Infrastructure | Core, Application | Repositories, external integrations |
| Presentation | All | MCP handlers, modules, middleware |

## Key Conventions

- Import paths: Always use `@/` aliases (mapped to `src/`)
- Constants: `app.constants.ts` (global) or `{domain}.constants.ts` (module-specific)
- Settings: All `process.env` access through `app.settings.ts` only
- DTOs: Data shapes + static mappers only — no business logic
- Exceptions: Custom domain exceptions extending `DomainException`
- Tenant isolation: Every query filters by `projectId` or `organizationId`

## Feature Structure

```
src/core/entities/{entity}.entity.ts
src/core/interfaces/repositories/{entity}.repository.interface.ts
src/core/exceptions/{domain}.exception.ts
src/application/{domain}/dto/
src/application/{domain}/services/{domain}.service.ts
src/application/{domain}/{domain}.constants.ts
src/infrastructure/database/repositories/{entity}.repository.ts
src/presentation/mcp/handlers/{domain}.handler.ts
src/presentation/http/modules/{domain}.module.ts
```

## Module Wiring Pattern

```typescript
@Module({
  imports: [DatabaseModule],
  providers: [
    FeatureService,
    { provide: FEATURE_REPOSITORY, useClass: FeatureRepository },
  ],
  exports: [FeatureService],
})
export class FeatureHttpModule {}
```

## MCP Handler Pattern

MCP tools are the presentation layer. Tenant context is resolved from config headers (`x-ks-org`, `x-ks-project`) via `ConfigTenantMiddleware`.

```typescript
server.tool('resource_create', CreateResourceSchema, async (params, extra) => {
  const { organizationId, projectId } = resolveTenant(extra);
  const result = await resourceService.create(projectId, params);
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
});

server.tool('resource_list', ListResourceSchema, async (params, extra) => {
  const { organizationId, projectId } = resolveTenant(extra);
  const result = await resourceService.list(projectId, params);
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
});
```

## Service Tenant Isolation

```typescript
async findById(projectId: string, id: string): Promise<Entity> {
  const entity = await this.repository.findById(id);
  // 404 for not found OR cross-project access (never 403)
  if (!entity || entity.projectId !== projectId) {
    throw new EntityNotFoundException();
  }
  return entity;
}
```

## See Also

- [Architecture Overview](../explanation/architecture/overview.md)
- [Architecture Patterns](../explanation/architecture/patterns.md)
- [Adding Features Guide](../contributing/adding-features.md)
