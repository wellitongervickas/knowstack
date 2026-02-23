# Contributing to KnowStack

Thank you for your interest in contributing to KnowStack! This document provides guidelines and links to help you get started.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How to Contribute

### Reporting Bugs

- Use the [Bug Report](https://github.com/knowstack-dev/knowstack/issues/new?template=bug_report.yml) issue template
- Include steps to reproduce, expected vs actual behavior, and environment details
- Check existing issues first to avoid duplicates

### Suggesting Features

- Use the [Feature Request](https://github.com/knowstack-dev/knowstack/issues/new?template=feature_request.yml) issue template
- Describe the problem you're solving and your proposed solution
- Consider alternatives and trade-offs

### Submitting Code

1. Fork the repository
2. Create a branch from `main` (`git checkout -b feature/your-feature`)
3. Make your changes following the coding standards below
4. Run verification:
   ```bash
   pnpm typecheck && pnpm build && pnpm test
   ```
5. Commit with a clear message describing the change
6. Push to your fork and submit a Pull Request

## Development Setup

See [docs/contributing/setup.md](docs/contributing/setup.md) for full setup instructions.

Quick version:

```bash
git clone https://github.com/knowstack-dev/knowstack.git
cd knowstack
pnpm install
docker-compose up -d
cp .env.example .env
pnpm prisma generate && pnpm prisma migrate dev
pnpm setup:seed
pnpm start:dev
```

## Coding Standards

This project follows Clean Architecture with strict conventions. Before writing code, read:

- **[Adding Features](docs/contributing/adding-features.md)** -- Step-by-step feature implementation checklist
- **[Architecture Patterns](docs/explanation/architecture/patterns.md)** -- DI with Symbols, decorators, imports, constants vs settings
- **[Architecture Overview](docs/explanation/architecture/overview.md)** -- Layer rules, folder structure, dependency direction

Key rules:

- Use `@/` import paths only (no relative `../` imports)
- Constants in `*.constants.ts`, not magic values
- All `process.env` access through `app.settings.ts` only
- Every data query must filter by `projectId` or `organizationId` (tenant isolation)
- Package manager is **pnpm** (not npm or yarn)

## Documentation

When your changes affect APIs or behavior, update the relevant docs. See [docs/contributing/documentation.md](docs/contributing/documentation.md) for the Diataxis framework and writing standards.

## Pull Request Process

1. Fill out the PR template completely
2. Ensure CI passes (typecheck, lint, build, test)
3. Link related issues using `Fixes #123` or `Relates to #456`
4. Keep PRs focused -- one feature or fix per PR
5. Respond to review feedback promptly

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
