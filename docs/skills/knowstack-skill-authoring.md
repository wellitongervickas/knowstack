---
name: knowstack-skill-authoring
description: Guide for creating effective skills in KnowStack following the Agent Skills specification. Use when writing new skill definitions, improving skill descriptions, fixing skill triggering issues, or authoring SKILL.md content.
---

# KnowStack Skill Authoring

## What Makes a Good Skill

A skill is a set of instructions that teaches AI how to handle specific tasks. Effective skills have:

1. **Clear description** with trigger phrases (WHAT + WHEN)
2. **Actionable instructions** with concrete examples
3. **Progressive disclosure** — core content in body, details in references

## Description Formula

```
[What it does] + [When to use it] + [Key capabilities]
```

### Good Descriptions

```yaml
# Specific with trigger phrases
description: NestJS + Clean Architecture patterns for backend development. Use when creating services, modules, handlers, or implementing new features.

# Includes file types
description: Prisma database patterns and migrations. Use when writing models, creating migrations, implementing repositories, or working with JSON fields.

# Clear scope boundaries
description: Vitest testing patterns for TypeScript APIs. Use when writing unit tests, creating test factories, or mocking repositories. Do NOT use for E2E or integration tests.
```

### Bad Descriptions

```yaml
# Too vague — won't trigger
description: Helps with development.

# Missing triggers — Claude won't know WHEN to use it
description: Complete guide to error handling patterns.

# Too technical — no user-facing language
description: Implements DomainException hierarchy with UPPER_SNAKE_CASE codes.
```

## Content Structure

```markdown
---
name: [kebab-case-name]
description: [Does X]. Use when [trigger 1], [trigger 2], or [trigger 3].
---

# [Skill Title]

## [Core Content]
[Most important patterns — the 80% use case]

## [Examples]
[Code examples for non-obvious patterns]

## [Checklist]
[Actionable verification items]

## See Also
[Links to related docs]
```

## Rules

### Naming
- Use `kebab-case`: `backend-patterns` not `BackendPatterns`
- Use descriptive nouns or gerunds: `error-handling`, `processing-pdfs`
- Match the folder name to the skill name

### Content
- Lead with the most critical information
- Use tables for structured data, code blocks for patterns
- Keep under 500 lines — move details to separate reference files
- Include concrete code examples, not abstract prose
- Add a checklist for actionable items

### Descriptions
- Under 500 characters (1024 max, but shorter is better for discovery)
- MUST include both WHAT and WHEN
- Include trigger phrases users would actually say
- Add negative triggers if the skill over-triggers: "Do NOT use for..."

## 3-Tier Visibility

| Visibility | Scope | Use Case |
|------------|-------|----------|
| PUBLIC | All projects | Base patterns seeded by KnowStack |
| ORGANIZATION | Org-wide | Shared team conventions |
| PRIVATE | Single project | Project-specific patterns |

**Override rule:** PRIVATE overrides ORGANIZATION overrides PUBLIC (by name).

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Description says what, not when | Add trigger phrases: "Use when..." |
| All content in one file | Split: 80% in body, 20% in references |
| Abstract prose without examples | Add concrete code blocks |
| Too broad — triggers on everything | Add scope boundaries and negative triggers |
| Duplicates content from other skills | Reference shared content via links |

## Creating via MCP

```
Tool: knowstack.save_skills
Args:
  name: "my-skill-name"
  description: "Does X. Use when Y."
  content: "[Full markdown content including frontmatter]"
```

## Iteration

After creating a skill, test it by:

1. Asking queries that SHOULD trigger it — does it load?
2. Asking unrelated queries — does it stay quiet?
3. Following the workflow — does it produce correct output?
4. Adjusting description and content based on results
