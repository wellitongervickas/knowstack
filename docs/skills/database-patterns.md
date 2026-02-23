---
name: database-patterns
description: Prisma database patterns, migrations, and repository implementation. Use when writing database models, creating migrations, implementing repositories, or working with JSON fields and upsert patterns.
---

# Database Patterns

## Prisma Schema Conventions

### Model Naming

- Models: PascalCase singular (`Instruction`, `Document`, `Project`)
- Table mapping: lowercase plural via `@@map("instructions")`
- Enums: PascalCase (`InstructionType`, `ProjectRole`)

### Standard Fields

Every model includes:

```prisma
model Entity {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("entities")
}
```

### Indexes

- Always index foreign keys: `@@index([projectId])`
- Add composite indexes for common query patterns: `@@index([type, visibility])`
- Composite unique constraints: `@@unique([name, type, projectId])`

### Relations

- Use `onDelete: Cascade` for child entities
- Optional foreign keys for shared resources: `projectId String?`
- Define both sides of relations

## Migration Workflow

```bash
# Create migration after schema changes
pnpm prisma migrate dev --name descriptive-name

# Generate Prisma client
pnpm prisma generate

# Reset database (development only)
pnpm prisma migrate reset
```

## Repository Pattern

### Interface Definition (Core Layer)

```typescript
export const ENTITY_REPOSITORY = Symbol('ENTITY_REPOSITORY');

export interface IEntityRepository {
  findById(id: string): Promise<Entity | null>;
  findByProjectId(projectId: string): Promise<Entity[]>;
  create(input: CreateEntityInput): Promise<Entity>;
  update(id: string, input: UpdateEntityInput): Promise<Entity>;
  delete(id: string): Promise<void>;
}
```

### Implementation (Infrastructure Layer)

```typescript
@Injectable()
export class EntityRepository implements IEntityRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Entity | null> {
    const doc = await this.prisma.entity.findUnique({ where: { id } });
    return doc ? this.mapToEntity(doc) : null;
  }

  private mapToEntity(doc: PrismaModel): Entity {
    return {
      id: doc.id,
      // ... map all fields
      metadata: (doc.metadata as Entity['metadata']) ?? {},
    };
  }
}
```

### JSON Fields

- Use `Json` type in Prisma schema with `@default("{}")`
- Cast with `as Prisma.InputJsonValue` when writing
- Cast with `as Entity['metadata']` when reading
- Always provide fallback: `?? {}`

## Upsert Pattern (for seeding)

Prisma doesn't support `null` in composite unique `where` clauses. Use findFirst + create/update:

```typescript
const existing = await prisma.entity.findFirst({
  where: { name, type, projectId: null },
});

if (existing) {
  await prisma.entity.update({ where: { id: existing.id }, data });
} else {
  await prisma.entity.create({ data: { ...data, projectId: null } });
}
```

## See Also

- [Architecture Patterns](../explanation/architecture/patterns.md)
- [Backend Patterns](backend-patterns.md)
