[Home](../index.md) > [About](index.md) > **Overview**

# Overview

KnowStack is an open-source, self-hostable platform that lets development teams query their documentation using AI — directly from IDEs and terminal tools via MCP.

## What KnowStack Does

KnowStack connects your team's documentation to AI-powered query interfaces. Instead of searching through wikis and repos, developers ask questions and get answers grounded in their own docs.

### Core Capabilities

- **MCP-Native** — Model Context Protocol as the sole interface; works with any MCP-compatible IDE or AI tool
- **AI-Powered Queries** — Natural language queries against your documentation, with answers grounded in your actual content
- **Multi-Source Ingestion** — Import from local files and URLs with content-hash deduplication
- **Multi-Tenant Architecture** — Organizations and projects with config-driven tenant resolution
- **Semantic Search** — Vector embeddings for relevance-ranked document retrieval
- **Local-First** — No authentication required; tenant context via HTTP headers

### How It Works

1. **Seed documentation** — Run `pnpm setup:seed` to create an org/project and ingest markdown files. KnowStack stores and indexes the content.
2. **Connect your tools** — Use MCP headers (`x-ks-org`, `x-ks-project`) to connect IDEs, AI assistants, or custom integrations.
3. **Query with context** — Ask questions from your editor. KnowStack retrieves relevant documents and returns AI-generated answers grounded in your team's knowledge.

### Architecture Highlights

- **NestJS 11** with Clean Architecture (Core / Application / Infrastructure / Presentation)
- **PostgreSQL 16** for relational data, **Redis 7** for caching
- **Provider-agnostic AI** — Swap AI providers without code changes
- **TypeScript** end-to-end with strict typing

## See Also

- [Why KnowStack?](why-knowstack.md) - Differentiators and project philosophy
- [Use cases](use-cases.md) - Real-world scenarios
- [Architecture overview](../explanation/architecture/overview.md) - Detailed system design
- [Quick Start](../tutorials/quick-start.md) - Get running locally
