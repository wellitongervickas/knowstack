[Home](../index.md) > [Guides](index.md) > **SDK Setup**

# SDK Setup Guide

How to set up a KnowStack project using the `@knowstack/sdk` CLI from any directory.

## Prerequisites

- Node.js 18+ and npm (or pnpm/yarn)
- A running KnowStack server (see [Quick Start](../tutorials/quick-start.md))

## Overview

The SDK CLI replaces the old `pnpm setup:seed` script. It connects to a running KnowStack server via MCP and walks you through creating an organization, project, ingesting documentation, seeding instructions, and generating embeddings.

Unlike the old setup script, the SDK:

- Works from **any directory** — no need to clone the KnowStack repo
- Requires **no database access** — communicates entirely via MCP
- Stores config in a portable `knowstack.config.json` file
- Outputs ready-to-use IDE configuration snippets

## Usage

```bash
npx @knowstack/sdk --init
```

### Options

| Flag                  | Description                    |
| --------------------- | ------------------------------ |
| `--init`              | Start the interactive setup    |
| `--profile <name>`    | Use or create a named profile  |
| `--help`, `-h`        | Show help message              |
| `--version`, `-v`     | Show version                   |

### Named profiles

Profiles allow managing multiple KnowStack projects from the same directory:

```bash
# Create or use a profile named "staging"
npx @knowstack/sdk --init --profile staging
```

## Setup Flow

The CLI guides you through these steps:

1. **Select profile** — Choose an existing profile or create a new one
2. **MCP server URL** — Enter the KnowStack server URL (default: `http://localhost:3000/api/v1/mcp`)
3. **Health check** — Verifies the server is reachable
4. **Organization** — Create a new organization or select an existing one
5. **Project** — Create a new project or select an existing one
6. **Context projects** — Optionally share data from other projects in the same org
7. **Document ingestion** — Ingest markdown files from a local directory
8. **Instruction seeding** — Seed agents, skills, commands, and templates
9. **Embeddings** — Generate vector embeddings for documents and instructions
10. **Summary** — Prints IDE configuration snippets for Claude Code, VS Code, and Cursor

## Configuration File

The SDK stores profiles in `knowstack.config.json` in the current working directory:

```json
{
  "default": {
    "mcpUrl": "http://localhost:3000/api/v1/mcp",
    "orgSlug": "my-org",
    "projectSlug": "api-docs",
    "docsDir": "./docs"
  }
}
```

Re-running `npx @knowstack/sdk --init` with an existing profile reuses saved values, letting you skip through unchanged prompts.

## IDE Configuration

After setup, the CLI prints configuration snippets for connecting your IDE. Example output:

**Claude Code (CLI command):**

```bash
claude mcp add knowstack --transport http http://localhost:3000/api/v1/mcp \
  -H "x-ks-org: my-org" -H "x-ks-project: api-docs"
```

**Claude Code (`.claude.json`):**

```json
{
  "mcpServers": {
    "knowstack": {
      "type": "http",
      "url": "http://localhost:3000/api/v1/mcp",
      "headers": {
        "x-ks-org": "my-org",
        "x-ks-project": "api-docs"
      }
    }
  }
}
```

**VS Code / Cursor (`.vscode/mcp.json`):**

```json
{
  "servers": {
    "knowstack": {
      "type": "http",
      "url": "http://localhost:3000/api/v1/mcp",
      "headers": {
        "x-ks-org": "my-org",
        "x-ks-project": "api-docs"
      }
    }
  }
}
```

## Context Projects

Context projects let a project inherit data from sibling projects in the same organization. During setup, you can select which projects to share and what data types (agents, commands, skills, documents, memory).

The context is encoded in the `x-ks-context` header. See [Common Headers](../reference/integrations/common-headers.md) for details.

## Troubleshooting

### MCP server not reachable

Ensure the KnowStack server is running:

```bash
# If running locally
pnpm start:dev

# If using Docker
docker compose up -d
```

### Organization or project already exists

The CLI handles duplicates gracefully — if the slug already exists, it selects the existing entity instead of creating a new one.

---

## See Also

- [Quick Start](../tutorials/quick-start.md) - Server installation and first run
- [MCP Reference](../reference/api/mcp.md) - Tenant-scoped MCP tools
- [Admin MCP Reference](../reference/api/admin-mcp.md) - Organization and project management tools
- [Backfill Embeddings](backfill-embeddings.md) - Manual embedding management
