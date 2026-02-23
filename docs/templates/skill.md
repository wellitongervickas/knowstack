---
name: skill
description: Agent Skills spec template for creating skill definitions. Use when authoring new skills, following the agentskills.io specification, or improving skill triggering and descriptions.
---

# Skill Definition Template (Agent Skills Spec)

Creates well-structured, spec-compliant skill definitions following the [Agent Skills open standard](https://agentskills.io/specification). Skills work with any compatible AI tool - Claude, Gemini CLI, Cursor, VS Code, OpenAI Codex, and more.

## When to Use

- Defining a new skill
- Updating an existing skill's content
- Improving skill triggering and descriptions
- Following the agentskills.io specification

## Skill Structure

```markdown
---
name: {skill-name}
description: {Does X for Y context}. Use when {trigger 1}, {trigger 2}, or {trigger 3}.
metadata:
  author: {team}
  version: "1.0"
---

# {Skill Title}

{One-line summary of what this skill provides.}

## {Core Content}

{Primary patterns, conventions, or rules.}

## {Examples}

{Code examples, templates, or reference material.}

## {Checklist}

{Actionable checklist for using this skill.}
```

---

## Frontmatter Reference

### Required Fields

| Field | Format | Constraints |
|-------|--------|------------|
| `name` | `kebab-case` | 1-64 chars. Lowercase letters, numbers, hyphens only. No consecutive hyphens. |
| `description` | Plain text | 1-1024 chars. Must describe WHAT and WHEN (trigger phrases). |

### Optional Fields

| Field | Format | Description |
|-------|--------|------------|
| `license` | Plain text | License name or reference |
| `compatibility` | Plain text | Environment requirements |
| `metadata` | YAML map | Recommended: `author`, `version` (always quoted) |

---

## Description Best Practices

The description is the most important field - it determines when agents activate the skill.

**Formula:** `[What it does] + [When to use it]`

```yaml
# Good - specific with triggers
description: NestJS + Clean Architecture patterns for backend. Use when creating services, modules, or implementing features.

# Bad - too vague
description: Helps with projects.

# Bad - missing triggers
description: Creates documentation systems.
```

---

## Progressive Disclosure

| Level | Content | Tokens | When Loaded |
|-------|---------|--------|-------------|
| 1 | Name + description | ~100 | Always (startup) |
| 2 | Full body | <5000 | When activated |
| 3 | References | As needed | On demand |

- Put the 80% use case in the body
- Put the remaining 20% in reference documents (`knowstack.save_documents`)
- Target body under 500 lines

---

## Skill Types

| Purpose | Naming Pattern | Description Pattern |
|---------|---------------|-------------------|
| Conventions | `{domain}-design` | `{Domain} conventions for {project}. Use when designing...` |
| Architecture | `{pattern}-architecture` | `{Pattern} principles for {project}. Use when designing...` |
| Implementation | `{tech}-patterns` | `{Tech} patterns for {project}. Use when implementing...` |
| Security | `{framework}-audit` | `{Framework} checklist for {project}. Use when auditing...` |

---

## Content Guidelines

- Lead with the most critical information
- Use tables for structured data
- Use code blocks for patterns (not prose)
- Prefer checklists over paragraphs for actionable items
- Be prescriptive about conventions, flexible about implementation details

---

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Verbose descriptions (>500 chars) | Keep concise: `Does X. Use when Y.` |
| Missing trigger phrases | Always include "Use when..." |
| Monolithic content (>500 lines) | Split into body + reference documents |
| Abstract prose without examples | Always include code examples |
| IDE-specific paths | Use MCP tools or relative references |
| Unquoted version numbers | Quote: `version: "1.0"` |
| Consecutive hyphens in name | Use single hyphens: `my-skill` |

---

## Creation Checklist

### Frontmatter

- [ ] `name` is 1-64 chars, kebab-case, no consecutive hyphens
- [ ] `description` follows `Does X. Use when Y.` pattern
- [ ] `description` under 500 characters
- [ ] `metadata.version` quoted as string

### Body

- [ ] Starts with `# Title` and one-line summary
- [ ] Core patterns in the first section
- [ ] Code examples for non-obvious patterns
- [ ] Actionable checklist where applicable
- [ ] Under 500 lines total

### Quality

- [ ] No duplicate content with other skills
- [ ] No IDE-specific paths
- [ ] Progressive disclosure respected
- [ ] Tested by invoking and verifying behavior

---

## Managing Skills via MCP

### Create or Update

```
knowstack.save_skills(name: "{skill-name}", description: "{Does X. Use when Y.}", content: "{full content}")
```

### List All

```
knowstack.get_skills()
```

### Get Full Content

```
knowstack.get_skills(name: "{skill-name}")
```

### Search

```
knowstack.search_instructions(q: "{keyword}", type: "SKILL")
```

### Check Existing

Always use `knowstack.get_skills()` to list available skills before creating new ones to avoid duplication.

## Save

After creating a skill definition, save it:

```
knowstack.save_skills(name: "{skill-name}", description: "{description}", content: "{full content}")
```
