---
name: sdk-release
description: Builds and publishes @knowstack/sdk to npm. Use when bumping the SDK version, releasing after code changes in packages/sdk/, or verifying a published release.
---

# SDK Release Checklist

Build, version, and publish `@knowstack/sdk` to the npm registry.

## Prerequisites

- [ ] Authenticated with npm (`npm login` — check with `npm whoami`)
- [ ] Member of the `@knowstack` npm organization
- [ ] OTP authenticator ready (if 2FA is enabled on npm)

## Pre-release Checks

- [ ] All API changes that the SDK depends on are merged and deployed
- [ ] SDK builds cleanly: `pnpm sdk:build`
- [ ] API passes full verification: `pnpm typecheck && pnpm build && pnpm test`
- [ ] No uncommitted changes in `packages/sdk/`

## Version Bump

Decide the version increment based on changes:

| Change Type | Bump | Example |
|-------------|------|---------|
| Bug fix, metadata update | patch | `0.1.0` → `0.1.1` |
| New feature, new step | minor | `0.1.0` → `0.2.0` |
| Breaking change (CLI args, config format) | major | `0.1.0` → `1.0.0` |

Update the version in `packages/sdk/package.json`:

```json
"version": "X.Y.Z"
```

## Release

Run the release command from the repository root:

```bash
pnpm sdk:release
```

This executes: `clean` → `build` → `npm publish --access public`.

If npm prompts for OTP, provide the code from your authenticator.

## Post-release Verification

- [ ] Package visible at https://www.npmjs.com/package/@knowstack/sdk
- [ ] Version matches: `npm view @knowstack/sdk version`
- [ ] Installable: `npx @knowstack/sdk --version`
- [ ] Functional: `npx @knowstack/sdk --help`

## What the Release Command Does

`pnpm sdk:release` runs `pnpm --filter @knowstack/sdk release`, which:

1. **clean** — `rm -rf dist` removes previous build artifacts
2. **build** — `tsc -p tsconfig.build.json` compiles TypeScript to `dist/`
3. **publish** — `npm publish --access public` uploads to npm registry

The `files` field in `package.json` ensures only `dist/` is included in the tarball.

## Troubleshooting

### `npm error code ENEEDAUTH`

Not logged in. Run `npm login` first.

### `npm error code EOTP`

2FA is enabled. Provide OTP via `--otp=<code>` or when prompted.

### `npm error 403 Forbidden`

You're not a member of the `@knowstack` npm org, or your token lacks publish permissions.

### `npm error 402 Payment Required`

Scoped packages require `--access public` (already included in the release script) or a paid npm plan for private packages.
