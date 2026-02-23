[Home](../index.md) > [Tutorials](index.md) > **Quick Start**

# Quick Start

Get KnowStack running locally and make your first query via MCP.

## Prerequisites

- Node.js 20+
- pnpm (`npm install -g pnpm`)
- Docker & Docker Compose

## Installation

```bash
git clone <repository-url>
cd knowstack
pnpm install
```

## Configure Environment

```bash
cp .env.example .env
```

The default `.env` works for local development. See `.env.example` for all available options.

## Start Services

```bash
# Start PostgreSQL and Redis
docker compose up -d db redis
```

## Setup Database

```bash
pnpm prisma generate
pnpm prisma migrate dev
```

## Seed Data

The setup wizard creates your organization, project, and ingests documentation directly into the database. No server required.

```bash
pnpm setup:seed
```

Follow the interactive prompts to create your org/project and ingest docs. The wizard prints MCP connection config at the end.

## Start the Server

```bash
pnpm start:dev
```

The server runs at `http://localhost:3000`.

## Connect via MCP

Use the config printed by the setup wizard to connect any MCP-compatible tool. Example for a CLI tool:

```bash
# Example: Claude Code (adapt for your MCP client)
claude mcp add knowstack \
  --transport http http://localhost:3000/api/v1/mcp \
  -H "x-ks-org: your-org-slug" \
  -H "x-ks-project: your-project-slug"
```

For IDE-based clients, see [MCP Reference — Client Configuration](../reference/api/mcp.md#client-configuration).

## Common Scripts

| Script               | Description           |
| -------------------- | --------------------- |
| `pnpm setup:seed`    | Seed org, project, docs |
| `pnpm start:dev`     | Start with hot reload |
| `pnpm build`         | Build for production  |
| `pnpm prisma studio` | Open database GUI     |
| `pnpm test`          | Run unit tests        |

## Next Steps

- [MCP Reference](../reference/api/mcp.md) - Full MCP tool documentation
- [cURL Examples](../reference/integrations/curl.md) - Command-line examples
- [Backfill Embeddings](../guides/backfill-embeddings.md) - Add semantic search to your documents

## See Also

- [cURL Examples](../reference/integrations/curl.md)
- [JavaScript Examples](../reference/integrations/javascript.md)
