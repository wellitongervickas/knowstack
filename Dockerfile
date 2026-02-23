# Based on official Prisma + pnpm Docker best practices
# https://www.prisma.io/docs/guides/docker
# https://pnpm.io/docker

FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

# Install OpenSSL (required by Prisma on Debian)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files (workspace root + all workspace package.json files)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/sdk/package.json ./packages/sdk/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code (SDK source not needed for API image)
COPY . .

# Generate Prisma client (needed for TypeScript compilation)
RUN pnpm exec prisma generate

# Build the application
RUN pnpm run build

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nestjs

USER nestjs

EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]
