# knowstack (beta)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-red.svg)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)

A self-hostable platform that connects development teams to their technical documentation through AI-native interfaces. Query specs, patterns, and guidelines directly from your IDE via the Model Context Protocol (MCP). Learn more in [About](docs/about/overview.md).

## Features

- **MCP-Native** -- Model Context Protocol as the sole interface; works with any MCP-compatible IDE or AI tool
- **AI-Powered Queries** -- Natural language queries against your documentation with cited answers
- **Semantic Search** -- Vector embeddings for relevance-ranked document retrieval
- **Multi-Source Ingestion** -- Import from local files and URLs
- **Multi-Tenant Architecture** -- Organizations and projects with config-driven tenant resolution
- **Local-First** -- No authentication required; tenant context via HTTP headers
- **Self-Hostable** -- Deploy on your own infrastructure with Docker

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ and pnpm

### 1. Clone and Install

```bash
git clone https://github.com/wellitongervickas/knowstack.git
cd knowstack
pnpm install
cp .env.example .env
```

### 2. Start Services

#### Option A: Docker (all-in-one)

Starts PostgreSQL, Redis, and the app server in containers.

```bash
docker compose up -d
pnpm prisma migrate deploy
```

#### Option B: Local Development (hot reload)

Starts only the database and cache in containers; run the server locally.

```bash
docker compose up -d db redis
pnpm prisma generate
pnpm prisma migrate dev
```

### 3. Seed Data

The SDK CLI creates your organization, project, ingests documentation, and seeds AI instructions. It works from any directory and prints MCP connection config at the end.

```bash
npx @knowstack/sdk --init
```

See the [SDK Setup Guide](docs/guides/sdk-setup.md) for full options including named profiles.

### 4. Start and Connect

**Option A:** The server is already running at `http://localhost:3000`.

**Option B:** Start the server:

```bash
pnpm start:dev
```

Use the MCP config printed by the SDK to connect your IDE. See [MCP Integration](#mcp-integration) below.

## MCP Integration

KnowStack exposes MCP tools for document queries, search, instruction retrieval, and memory management. See the [MCP Reference](docs/reference/api/mcp.md) for details.

**Claude Code:**

```bash
claude mcp add knowstack \
  --transport http http://localhost:3000/api/v1/mcp \
  -H "x-ks-org: your-org-slug" \
  -H "x-ks-project: your-project-slug"
```

**VS Code / Cursor (`.vscode/mcp.json`):**

```json
{
  "servers": {
    "knowstack": {
      "type": "http",
      "url": "http://localhost:3000/api/v1/mcp",
      "headers": {
        "x-ks-org": "your-org-slug",
        "x-ks-project": "your-project-slug"
      }
    }
  }
}
```

---

## Common Scripts

| Script                    | Description                                   |
| ------------------------- | --------------------------------------------- |
| `npx @knowstack/sdk --init` | Interactive setup wizard (org, project, docs) |
| `pnpm start:dev`          | Start development server with hot reload      |
| `pnpm start:debug`        | Start with debugger attached                  |
| `pnpm build`              | Build for production                          |
| `pnpm start:prod`         | Run production build                          |
| `pnpm prisma studio`      | Open Prisma database GUI                      |
| `pnpm prisma migrate dev` | Run database migrations                       |
| `pnpm test`               | Run unit tests                                |

---

## Documentation

- [MCP Reference](docs/reference/api/mcp.md) -- Tools, configuration, error handling
- [Architecture](docs/explanation/architecture/overview.md) -- System design and patterns
- [Getting Started](docs/tutorials/quick-start.md) -- Full setup guide
- [Documentation](docs/index.md) -- Full documentation navigation

## Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) before submitting a PR.

- [Development Setup](docs/contributing/setup.md)
- [Coding Standards](docs/contributing/adding-features.md)
- [Documentation Guide](docs/contributing/documentation.md)

## Security

To report a security vulnerability, please open a [private issue on GitHub](https://github.com/wellitongervickas/knowstack/issues). See [SECURITY.md](SECURITY.md) for details.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
