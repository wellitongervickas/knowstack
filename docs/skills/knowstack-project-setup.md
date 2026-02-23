---
name: knowstack-project-setup
description: Step-by-step workflow for setting up a new project knowledge base in KnowStack. Use when onboarding a new project, initializing instructions, creating initial agent or skill definitions, or bootstrapping a knowledge repository.
---

# KnowStack Project Setup

## Overview

This skill guides you through setting up a complete knowledge base for a new project using KnowStack MCP tools. Follow these steps in order.

## Step 1: Define the Project Agent

Create the primary agent instruction that defines how AI should behave in this project context.

```
Tool: knowstack.save_agents
Args:
  name: "Developer"
  description: "Primary development agent for [project-name]"
  content: |
    # Developer Agent
    ## Role
    [Define the agent's role and responsibilities]
    ## Conventions
    [List coding conventions, patterns, and standards]
    ## Workflow
    [Define the expected development workflow]
```

**Key points:**
- Start with one agent, expand later
- Keep the description actionable with trigger phrases
- Content should be concise — link to docs for details

## Step 2: Seed Core Skills

Create skills that capture reusable patterns for the project.

```
Tool: knowstack.save_skills
Args:
  name: "[domain]-patterns"
  description: "[Domain] patterns for [project]. Use when [trigger conditions]."
  content: |
    ---
    name: [domain]-patterns
    description: [Same as above]
    ---
    # [Domain] Patterns
    ## [Section 1]
    [Core patterns and conventions]
    ## [Section 2]
    [Code examples]
```

**Recommended starter skills:**
- `backend-patterns` — Architecture and coding conventions
- `testing-patterns` — Test structure and required scenarios
- `error-handling` — Exception hierarchy and rules

## Step 3: Create Commands

Define reusable command instructions for common operations.

```
Tool: knowstack.save_commands
Args:
  name: "Review"
  description: "Code review checklist for [project]"
  content: |
    # Code Review
    ## Checklist
    - [ ] Tests pass
    - [ ] No magic values
    - [ ] Tenant isolation verified
    - [ ] Documentation updated
```

## Step 4: Initialize Memory

Save project-specific context that persists across sessions.

```
Tool: knowstack.save_memory
Args:
  name: "project-context"
  content: |
    # [Project Name]
    ## Stack
    - Runtime: [e.g., Node.js 20]
    - Framework: [e.g., NestJS]
    - Database: [e.g., PostgreSQL + Prisma]
    ## Key Decisions
    - [Decision 1 and rationale]
    - [Decision 2 and rationale]
```

## Step 5: Add Documentation

Save project documentation for AI-powered queries.

```
Tool: knowstack.save_documents
Args:
  title: "Architecture Overview"
  content: "[Full markdown content]"
  sourceType: "MANUAL"
```

## Verification

After setup, verify the knowledge base:

1. `knowstack.get_agents` — Should list your agent(s)
2. `knowstack.get_skills` — Should list your skills
3. `knowstack.get_commands` — Should list your commands
4. `knowstack.get_memory` — Should list your memory entries
5. `knowstack.query` with `query: "What is the project architecture?"` — Should return a coherent answer from your docs

## Troubleshooting

**No results from query:** Ensure documents are saved, not just instructions. The query tool searches documents specifically.

**Duplicate name error:** Instructions are unique by name + type within a project. Use `knowstack.save_*` which handles upserts automatically.

**Visibility confusion:** New instructions default to PRIVATE (project-scoped). Use ORGANIZATION for shared across projects.
