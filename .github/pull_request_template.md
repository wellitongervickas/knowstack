## Description

<!-- What does this PR do? Why is it needed? -->

## Related Issue

<!-- Link to the GitHub issue: Fixes #123 or Relates to #456 -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Testing

<!-- Describe how you tested these changes -->

- [ ] Unit tests pass (`pnpm test`)
- [ ] Type check passes (`pnpm typecheck`)
- [ ] Build succeeds (`pnpm build`)
- [ ] Lint passes (`pnpm lint`)

## Checklist

- [ ] My code follows the project's [coding standards](docs/contributing/adding-features.md)
- [ ] I have used `@/` import paths (no relative `../` imports)
- [ ] New constants are in `*.constants.ts`, not magic values
- [ ] No `process.env` access outside `app.settings.ts`
- [ ] Tenant isolation is maintained (queries filter by projectId/organizationId)
- [ ] I have updated documentation if needed
