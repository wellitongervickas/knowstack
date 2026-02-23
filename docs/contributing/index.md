[Home](../index.md) > **Contributing**

# Contributing

Documentation for developers contributing to KnowStack.

## Getting Started

- [Development Setup](setup.md) - Set up your local environment
- [Adding Features](adding-features.md) - Code guidelines and patterns
- [Documentation Guide](documentation.md) - How to write docs (Diátaxis framework)

---

## Development Workflow

1. **Setup** - Clone repo, install dependencies, start services
2. **Develop** - Make changes following the patterns
3. **Test** - Run unit tests and type checks
4. **Submit** - Create PR with clear description

---

## Code Organization

```
src/
├── core/           # Domain layer (entities, interfaces)
├── application/    # Business logic (services, DTOs)
├── infrastructure/ # External integrations (DB, Redis, AI)
├── presentation/   # HTTP layer (MCP endpoint, modules)
└── common/         # Cross-cutting concerns (middleware, decorators)
```

See [Architecture Overview](../explanation/architecture/overview.md) for details.

---

## Key Patterns

- **Dependency Injection** - Use Symbol tokens for interfaces
- **Repository Pattern** - Abstract data access
- **Clean Architecture** - Dependencies point inward
- **Request-Scoped Context** - TenantContext via nestjs-cls

See [Patterns](../explanation/architecture/patterns.md) for details.

---

## Quick Commands

```bash
pnpm install          # Install dependencies
pnpm start:dev        # Start with hot reload
pnpm build            # Build for production
pnpm test             # Run unit tests
pnpm typecheck        # Type check
pnpm prisma studio    # Database GUI
```

---

## See Also

- [Architecture](../explanation/architecture/overview.md) - System design
- [Patterns](../explanation/architecture/patterns.md) - Code conventions
