[Home](../index.md) > [Contributing](index.md) > **Documentation**

# Documentation Guide

How to write documentation for KnowStack following the Diátaxis framework.

## Framework

KnowStack documentation follows the **Diátaxis framework** - a systematic approach to technical documentation that organizes content into four distinct quadrants.

**Research Sources:**

- [Diátaxis](https://diataxis.fr/) - The framework specification
- [Divio Documentation System](https://docs.divio.com/documentation-system/) - Original implementation
- [Documentation Best Practices](https://www.42coffeecups.com/blog/technical-documentation-best-practices) - Modular content principles

---

## The Four Quadrants

```
                    PRACTICAL                         THEORETICAL
              ┌─────────────────────────────────────────────────────┐
              │                                                     │
   LEARNING   │   TUTORIALS          │      EXPLANATION            │
              │   (Learning-oriented)│      (Understanding-oriented)│
              │   "Follow these      │      "Here's why this       │
              │    steps to learn"   │       works this way"       │
              │                      │                              │
              ├──────────────────────┼──────────────────────────────┤
              │                      │                              │
   WORKING    │   HOW-TO GUIDES      │      REFERENCE              │
              │   (Task-oriented)    │      (Information-oriented)  │
              │   "How to solve      │      "Technical specs       │
              │    this problem"     │       and details"          │
              │                      │                              │
              └─────────────────────────────────────────────────────┘
```

---

## Content Placement

### Tutorials (`docs/tutorials/`)

**Purpose:** Learning-oriented, for beginners

**Characteristics:**

- Step-by-step instructions
- Has a clear beginning, middle, end
- Produces a working result
- Teaches concepts through practice
- No prerequisites beyond basic setup

**File naming:** `verb-noun.md` or `noun.md`

- `quick-start.md`

**Example structure:**

```markdown
# Tutorial Title

Brief intro of what you'll learn.

## Prerequisites

What the reader needs before starting.

## Step 1: First Action

Instructions...

## Step 2: Next Action

Instructions...

## Congratulations!

Summary of what was accomplished.

## Next Steps

Links to related content.
```

---

### Guides (`docs/guides/`)

**Purpose:** Task-oriented, for practitioners

**Characteristics:**

- Solves a specific problem
- Assumes some familiarity
- "How to X" format
- Multiple ways to achieve goal
- Links to reference for details

**File naming:** `noun.md` (the thing being managed)

- `backfill-embeddings.md`

**Example structure:**

```markdown
# Guide Title

Brief overview of what this guide covers.

## Overview

Context and when to use this.

## Doing the Task

Step-by-step instructions with examples.

## Common Variations

Alternative approaches if applicable.

## See Also

- Links to related guides
- Links to reference docs
```

---

### Reference (`docs/reference/`)

**Purpose:** Information-oriented, for practitioners

**Characteristics:**

- Exhaustive and accurate
- Consistent format
- No explanation of "why"
- Easy to scan/search
- Tables, schemas, examples

**File naming:** `noun.md` (the thing being documented)

- `api/mcp.md`
- `configuration/settings.md`
- `configuration/embedding.md`

**Example structure:**

```markdown
# Reference Title

Brief description of what this documents.

## Endpoint/Entity Name

### Method/Field

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `field`   | type | Yes/No   | Description |

### Example

\`\`\`json
{ "example": "data" }
\`\`\`

## See Also

- Links to related reference
- Links to guides for "how to"
```

---

### Explanation (`docs/explanation/`)

**Purpose:** Understanding-oriented, for learners

**Characteristics:**

- Explains concepts and decisions
- Provides context and background
- Connects ideas together
- No step-by-step instructions
- Answers "why" questions

**File naming:** `noun.md` (the concept)

- `concepts/multi-tenancy.md`
- `concepts/semantic-retrieval.md`
- `architecture/patterns.md`

**Example structure:**

```markdown
# Concept Title

Introduction to the concept.

## Overview

What it is and why it matters.

## How It Works

Conceptual explanation (not step-by-step).

## Design Decisions

Why it's implemented this way.

## See Also

- Links to related concepts
- Links to guides for practical use
```

---

## File Organization

```
docs/
├── index.md                    # Navigation hub
├── tutorials/                  # Learning by doing
│   └── index.md               # List of tutorials
├── guides/                     # Task completion
│   ├── index.md               # List of guides
│   └── integrations/          # Integration-specific guides
├── reference/                  # Technical specs
│   ├── index.md               # Reference overview
│   └── api/                   # API endpoint specs
├── explanation/                # Understanding
│   ├── index.md               # Explanation overview
│   ├── concepts/              # Core concepts
│   └── architecture/          # System design
├── agents/                     # AI agent definitions (seeded as PUBLIC)
├── skills/                     # Skill definitions (seeded as PUBLIC)
├── commands/                   # Command definitions (seeded as PUBLIC)
├── templates/                  # Template definitions (seeded as PUBLIC)
├── contributing/               # Contributor docs
└── about/                      # Business/product info
```

---

## Cross-References

### Required Sections

Every file must end with a "See Also" section:

```markdown
## See Also

- [Related Guide](../guides/related.md) - Brief description
- [Related Reference](../reference/api/related.md) - Brief description
```

### Link Patterns

| From        | Link To                  | Purpose                        |
| ----------- | ------------------------ | ------------------------------ |
| Tutorial    | Next tutorial, Reference | "Learn more", "Full spec"      |
| Guide       | Reference, Explanation   | "API details", "Background"    |
| Reference   | Guide, Related reference | "How to use", "Related"        |
| Explanation | Guide, Reference         | "In practice", "Specification" |

### Relative Paths

Always use relative paths:

```markdown
# From docs/guides/backfill-embeddings.md

[Embedding Configuration](../reference/configuration/embedding.md)
[Semantic Retrieval](../explanation/concepts/semantic-retrieval.md)

# From docs/reference/api/mcp.md

[Backfill Guide](../../guides/backfill-embeddings.md)
```

---

## Writing Style

### Headings

- Use sentence case: "Getting started" not "Getting Started"
- Exception: Proper nouns ("GitHub App")

### Code Examples

- Always include working examples
- Show both request and response
- Use realistic but obviously fake data

### Tables

- Use tables for structured data (parameters, fields, options)
- Include Type and Required columns for API docs

### Avoid

- Time estimates ("this takes 5 minutes")
- Subjective language ("easy", "simple", "just")
- Duplicate content - link instead
- Outdated information - verify against code

---

## Adding New Documentation

### New Feature

When adding a new feature, create:

1. **Reference** (`reference/api/feature.md`) - Endpoint specs
2. **Guide** (`guides/feature.md`) - How to use it
3. **Explanation** (`explanation/concepts/feature.md`) - If new concept

### New Tutorial

1. Add to `tutorials/` with clear prerequisites
2. Update `tutorials/index.md`
3. Link from relevant guides

### Updating Existing Docs

1. Update the source file
2. Check all cross-references still work
3. Update related files if scope changed

---

## Verification

Before committing documentation changes:

1. **Links work** - All internal links resolve
2. **Code works** - Examples are accurate
3. **Cross-refs exist** - Every file has "See Also"
4. **Index updated** - New files listed in index.md
5. **Quadrant correct** - Content matches its category

---

## See Also

- [Development Setup](setup.md) - Local environment
- [Adding Features](adding-features.md) - Code guidelines
