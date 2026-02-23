[Home](../index.md) > **Skills**

# Skill Definitions

Reusable knowledge and pattern references delivered via MCP protocol. Skills follow the [Agent Skills open standard](https://agentskills.io/specification) and work with any compatible AI tool — Claude, Gemini CLI, Cursor, VS Code, OpenAI Codex, and more.

## Available Skills

### Development Patterns (KnowStack internals)

| Skill | Description |
|-------|-------------|
| [backend-patterns](backend-patterns.md) | NestJS + Clean Architecture patterns. Use when creating services, modules, or MCP handlers |
| [testing-patterns](testing-patterns.md) | Vitest testing patterns. Use when writing unit tests or mocking repositories |
| [database-patterns](database-patterns.md) | Prisma database patterns. Use when writing models, migrations, or repositories |
| [error-handling](error-handling.md) | Exception hierarchy patterns. Use when creating exceptions or handling errors |

### KnowStack Usage (for end users)

| Skill | Description |
|-------|-------------|
| [knowstack-project-setup](knowstack-project-setup.md) | Project knowledge base setup workflow. Use when onboarding a new project |
| [knowstack-skill-authoring](knowstack-skill-authoring.md) | Skill authoring guide. Use when creating or improving skills |
| [knowstack-knowledge-management](knowstack-knowledge-management.md) | Knowledge organization best practices. Use when structuring docs and instructions |

## How Skills Work

Skills are stored as `Instruction` entities with `type = SKILL` and served via MCP tools. Any MCP-compatible client can retrieve them — no IDE plugins or local file setup required.

### Delivery Model

```
MCP Client (any AI tool) → knowstack.get_skills → Skill content
```

### Visibility Tiers

| Tier | Scope | Override |
|------|-------|---------|
| PUBLIC | All projects | Base layer (seeded defaults) |
| ORGANIZATION | Org-wide | Overrides PUBLIC by name |
| PRIVATE | Single project | Overrides ORGANIZATION by name |

### Progressive Disclosure via MCP

1. **Discovery** — `knowstack.get_skills` (no args) returns lightweight listing (name + description only)
2. **Activation** — `knowstack.get_skills` with `name` returns full content
3. **References** — Additional context available via `knowstack.get_documents` or `knowstack.query`

## See Also

- [Agent Definitions](../agents/index.md)
- [Command Definitions](../commands/index.md)
- [Agent Skills Specification](https://agentskills.io/specification)
