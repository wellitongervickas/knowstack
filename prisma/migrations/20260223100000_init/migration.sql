-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MANUAL', 'URL');

-- CreateEnum
CREATE TYPE "InstructionType" AS ENUM ('AGENT', 'COMMAND', 'MEMORY', 'SKILL', 'TEMPLATE');

-- CreateEnum
CREATE TYPE "InstructionVisibility" AS ENUM ('PUBLIC', 'ORGANIZATION', 'PRIVATE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceType" "SourceType" NOT NULL DEFAULT 'MANUAL',
    "sourceUrl" TEXT,
    "contentHash" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_embeddings" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instructions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "InstructionType" NOT NULL,
    "visibility" "InstructionVisibility" NOT NULL DEFAULT 'PRIVATE',
    "description" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "projectId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instruction_embeddings" (
    "id" TEXT NOT NULL,
    "instructionId" TEXT NOT NULL,
    "projectId" TEXT,
    "organizationId" TEXT,
    "embedding" vector(1536) NOT NULL,
    "contentHash" TEXT NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "instruction_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "organizationId" TEXT,
    "projectId" TEXT,
    "requestId" TEXT,
    "source" TEXT,
    "metadata" JSONB DEFAULT '{}',

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "projects_organizationId_idx" ON "projects"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_organizationId_slug_key" ON "projects"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "documents_projectId_idx" ON "documents"("projectId");

-- CreateIndex
CREATE INDEX "documents_contentHash_idx" ON "documents"("contentHash");

-- CreateIndex
CREATE INDEX "documents_sourceUrl_idx" ON "documents"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "documents_projectId_contentHash_key" ON "documents"("projectId", "contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "document_embeddings_documentId_key" ON "document_embeddings"("documentId");

-- CreateIndex
CREATE INDEX "document_embeddings_projectId_idx" ON "document_embeddings"("projectId");

-- CreateIndex
CREATE INDEX "document_embeddings_contentHash_idx" ON "document_embeddings"("contentHash");

-- CreateIndex
CREATE INDEX "instructions_projectId_idx" ON "instructions"("projectId");

-- CreateIndex
CREATE INDEX "instructions_organizationId_idx" ON "instructions"("organizationId");

-- CreateIndex
CREATE INDEX "instructions_organizationId_type_idx" ON "instructions"("organizationId", "type");

-- CreateIndex
CREATE INDEX "instructions_type_visibility_idx" ON "instructions"("type", "visibility");

-- CreateIndex
CREATE UNIQUE INDEX "instruction_embeddings_instructionId_key" ON "instruction_embeddings"("instructionId");

-- CreateIndex
CREATE INDEX "instruction_embeddings_projectId_idx" ON "instruction_embeddings"("projectId");

-- CreateIndex
CREATE INDEX "instruction_embeddings_organizationId_idx" ON "instruction_embeddings"("organizationId");

-- CreateIndex
CREATE INDEX "instruction_embeddings_contentHash_idx" ON "instruction_embeddings"("contentHash");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_timestamp_idx" ON "audit_logs"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_category_timestamp_idx" ON "audit_logs"("organizationId", "category", "timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_embeddings" ADD CONSTRAINT "document_embeddings_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instructions" ADD CONSTRAINT "instructions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instruction_embeddings" ADD CONSTRAINT "instruction_embeddings_instructionId_fkey" FOREIGN KEY ("instructionId") REFERENCES "instructions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
