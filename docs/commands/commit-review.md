---
name: commit-review
description: Commit message review guidelines
---

# Commit Message Guidelines

## Format

```
<type>: <description>

[optional body]
[optional footer]
```

## Types

- **feat**: New feature or capability
- **fix**: Bug fix
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **docs**: Documentation only changes
- **test**: Adding missing tests or correcting existing tests
- **chore**: Changes to build process or auxiliary tools
- **perf**: Performance improvement
- **style**: Formatting, missing semicolons, etc. (no code change)

## Rules

- Use imperative mood in the description ("add feature" not "added feature")
- Keep the first line under 70 characters
- Do not end the subject line with a period
- Separate subject from body with a blank line
- Reference issue numbers in the footer when applicable
- Use body to explain "what" and "why", not "how"

## Examples

```
feat: add instruction CRUD MCP tools

Implements project-scoped instruction tools with tenant isolation
via config headers (x-ks-org, x-ks-project).

Closes #42
```

```
fix: enforce tenant isolation on instruction queries

Cross-project access now returns 404 instead of 403
to prevent information leakage about resource existence.
```

```
refactor: extract pagination logic to shared utility

Reduces duplication across document and instruction list endpoints.
```

## Anti-Patterns

- "fix stuff" — too vague
- "WIP" — should not be in main branch
- "update file.ts" — describes what, not why
- Mixing multiple concerns in one commit

## See Also

- [Code Review Command](code-review.md)
- [Contributing Guide](../contributing/adding-features.md)
