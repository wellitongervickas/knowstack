[Home](../index.md) > [Contributing](index.md) > **Development Setup**

# Development Setup

Set up your local development environment for KnowStack.

## Prerequisites

- **Node.js 20+** - JavaScript runtime
- **pnpm** - Package manager (`npm install -g pnpm`)
- **Docker** - Container runtime
- **Docker Compose** - Multi-container orchestration

---

## Quick Start

```bash
# Clone the repository
git clone https://github.com/knowstack-dev/knowstack.git
cd knowstack

# Install dependencies
pnpm install

# Start database and Redis
docker compose up -d db redis

# Configure environment
cp .env.example .env

# Setup database
pnpm prisma generate
pnpm prisma migrate dev

# Seed data (org, project, docs, instructions)
pnpm setup:seed

# Start development server
pnpm start:dev
```

The server runs at `http://localhost:3000`.

---

## Docker Services

```bash
# Start all services
docker compose up -d

# Start specific service
docker compose up -d db
docker compose up -d redis

# View logs
docker compose logs -f

# Stop services
docker compose down
```

**Services:**

- `db` - PostgreSQL 16 on port 5432
- `redis` - Redis 7 on port 6379

---

## Environment Variables

Key variables in `.env`:

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/knowstack"

# Redis
REDIS_URL="redis://localhost:6379"

# AI Provider (optional)
AI_DEFAULT_PROVIDER="stub"  # or "openai"
OPENAI_API_KEY="sk-..."     # if using OpenAI
```

See `.env.example` for all options.

---

## Database

### Prisma Commands

```bash
# Generate Prisma client
pnpm prisma generate

# Run migrations
pnpm prisma migrate dev

# Reset database (destructive!)
pnpm prisma migrate reset --force

# Open database GUI
pnpm prisma studio
```

### Setup Script

The setup script seeds data directly into the database (no server required):

```bash
pnpm setup:seed
```

The setup script walks you through:

1. Organization creation (or reuses existing by slug)
2. Project creation (or reuses existing by slug)
3. Document ingestion from `./docs`
4. Instruction seeding (agents, skills, commands, templates)
5. MCP connection config output

---

## Development Commands

```bash
# Start with hot reload
pnpm start:dev

# Build for production
pnpm build

# Start production build
pnpm start:prod

# Run unit tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type check
pnpm typecheck

# Lint
pnpm lint
```

---

## IDE Setup

### VS Code

Recommended extensions:

- **Prisma** - Schema highlighting
- **ESLint** - Code linting
- **TypeScript** - Language support

### Settings

```json
{
  "editor.formatOnSave": true,
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

---

## Troubleshooting

### Database connection failed

```bash
# Check if PostgreSQL is running
docker compose ps

# Check logs
docker compose logs db
```

### Prisma client out of date

```bash
pnpm prisma generate
```

### Port already in use

```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>
```

---

## See Also

- [Adding Features](adding-features.md) - Development guide
- [Architecture](../explanation/architecture/overview.md) - Code structure
- [Patterns](../explanation/architecture/patterns.md) - Conventions
