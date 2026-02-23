---
name: knowstack-knowledge-management
description: Best practices for organizing project knowledge in KnowStack. Use when structuring documents, planning knowledge architecture, choosing between instruction types, managing visibility tiers, or optimizing AI-powered queries.
---

# KnowStack Knowledge Management

## Instruction Types

KnowStack organizes knowledge into 6 types. Choose the right one:

| Type | Purpose | When to Use |
|------|---------|-------------|
| **Documents** | Project documentation, reference material | Long-form content, API docs, guides, specs |
| **Agents** | AI behavior definitions | Defining roles, conventions, workflows for AI agents |
| **Skills** | Reusable patterns and expertise | Coding patterns, domain knowledge, best practices |
| **Commands** | Task-specific instructions | Code review, deployment, release checklists |
| **Templates** | Structured workflow patterns | Planning workflows, request frameworks, definition scaffolds |
| **Memory** | Persistent session context | Project decisions, preferences, running notes |

### Decision Flow

```
Is it reference material or documentation?
  → Document (knowstack.save_documents)

Is it defining how an AI agent should behave?
  → Agent (knowstack.save_agents)

Is it a reusable pattern or domain knowledge?
  → Skill (knowstack.save_skills)

Is it a step-by-step task or checklist?
  → Command (knowstack.save_commands)

Is it a reusable scaffold for structured workflows?
  → Template (knowstack.save_templates)

Is it context that should persist across conversations?
  → Memory (knowstack.save_memory)
```

## Visibility Strategy

### 3-Tier System

```
PUBLIC (base) < ORGANIZATION (team) < PRIVATE (project)
```

- **PUBLIC**: Seeded defaults. Cannot be created via API — only by seed scripts.
- **ORGANIZATION**: Shared across all projects in an org. Use for team-wide conventions.
- **PRIVATE**: Project-scoped. Use for project-specific overrides and customizations.

### Override Semantics

When the same name exists at multiple tiers, the most specific wins:
- A PRIVATE skill named "backend-patterns" overrides the PUBLIC one
- Only the winning tier's content is returned via `get_skills`

### Recommendations

| Content | Visibility | Rationale |
|---------|-----------|-----------|
| Base coding patterns | PUBLIC | Consistent foundation across all projects |
| Team code style | ORGANIZATION | Shared across team's projects |
| Project-specific patterns | PRIVATE | Only relevant to one project |
| Memory entries | PRIVATE (enforced) | Always project-scoped |

## Document Organization

### Naming Conventions

- Use descriptive titles: "Architecture Overview" not "doc1"
- Group related content: "API Reference - Users", "API Reference - Documents"
- Include source tracking: set `sourceType` and `sourceUrl` for external content

### Content Quality

- **Deduplication**: KnowStack deduplicates by content hash — saving the same content twice is safe
- **Search optimization**: The query tool performs semantic search. Use clear, descriptive language
- **Keyword search**: `knowstack.get_documents` with `q` param does keyword matching on title and content

## Search and Discovery

### Finding Instructions

```
Tool: knowstack.search_instructions
Args:
  q: "testing patterns"
  type: "SKILL"        # Optional: filter by type
  limit: 10            # Optional: max results
```

Returns lightweight results with scores. Fetch full content with the type-specific tool.

### Search Scoring

| Field | Weight | Impact |
|-------|--------|--------|
| Name | 0.5 | Highest — matches on name score the most |
| Description | 0.3 | Medium — good descriptions improve discoverability |
| Content | 0.2 | Lowest — body content is the tiebreaker |

**Implication**: Write clear, keyword-rich names and descriptions for better search results.

### Querying Documents

```
Tool: knowstack.query
Args:
  query: "How does tenant isolation work?"
  context: "security"   # Optional: narrow the search scope
```

Returns an AI-generated answer with cited sources from your documents.

## Memory Best Practices

### When to Use Memory

- Project stack and tooling decisions
- Architecture decisions and rationale
- User preferences (e.g., "always use pnpm", "never auto-commit")
- Running lists that evolve over time

### Updating Memory

Use `knowstack.update_memory` with `old_str`/`new_str` for targeted edits:

```
Tool: knowstack.update_memory
Args:
  name: "project-context"
  old_str: "Database: PostgreSQL"
  new_str: "Database: PostgreSQL 16 with pgvector"
```

### Organization

- One memory entry per topic: "project-context", "debugging-notes", "architecture-decisions"
- Keep entries focused — don't dump everything into one entry
- Prune outdated information regularly

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Everything as documents | Instructions are invisible to the query tool | Use the right instruction type |
| Giant memory entries | Hard to update, expensive to load | Split into focused topic entries |
| No descriptions on instructions | Poor discoverability via search | Always write meaningful descriptions |
| Duplicating content across types | Maintenance burden, inconsistency | Single source of truth, reference via links |
| Ignoring visibility tiers | Team patterns lost, no reuse | Use ORG for shared, PRIVATE for overrides |
