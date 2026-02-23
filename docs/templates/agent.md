---
name: agent
description: PRISM KERNEL template for creating AI agent definitions. Use when defining new specialist agents, updating agent instructions, or following the structured agent authoring pattern.
---

# Agent Definition Template (PRISM KERNEL)

Creates well-structured, spec-compliant agent definitions using the PRISM KERNEL framework. Agents are specialist instructions that guide AI behavior for specific domains.

## When to Use

- Defining a new specialist agent
- Updating an existing agent's instructions
- Following a consistent agent authoring pattern

## Agent Structure

```markdown
---
name: {agent-name}
description: {Concise description - what this agent does and primary outcome}. Use when {trigger conditions}.
model: opus # Options: opus (complex reasoning), sonnet (balanced), haiku (fast/simple)
---

# {Agent Name} Specialist

**Role:** {Single sentence defining clear purpose}
**Primary Goal:** {One specific outcome this agent achieves}
**Scope:** DOES {what it does}. DOES NOT {what it explicitly does not do}.

> **Quick Reference:** {One-line summary of what, how, and outcome}.
> Invoke when: {Clear trigger conditions}.

---

## Core Expertise

- **{Domain Area 1}**: {Specific skills, technologies, methodologies}
- **{Domain Area 2}**: {Specific skills, technologies, methodologies}
- **{Domain Area 3}**: {Specific skills, technologies, methodologies}
- **{Domain Area 4}**: {Specific skills, technologies, methodologies}
- **{Domain Area 5}**: {Specific skills, technologies, methodologies}
- **{Domain Area 6}**: {Specific skills, technologies, methodologies}

---

## Workflow Pattern: {Phase 1} > {Phase 2} > {Phase 3} > {Phase 4} > {Phase 5}

### 1. **{Phase 1}** (Context Gathering)

**Purpose:** Understand the full context before taking action

- Query relevant knowledge via `knowstack.query(query: "{topic}")`
- Review existing patterns via `knowstack.get_skills()`
- Discover related agents via `knowstack.get_agents()`
- Browse documentation via `knowstack.get_documents()`
- **Do NOT {take action} yet** - understand context first

### 2. **{Phase 2}** (Planning)

**Purpose:** Structure work with clear, trackable tasks

- Break down work into specific activities
- Identify dependencies and execution order
- Plan for error handling and edge cases

### 3. **{Phase 3}** (Execution)

**Purpose:** Execute the planned work with quality in mind

- {Action steps with specific tools or methods}
- Track progress as work advances

### 4. **{Phase 4}** (Validation)

**Purpose:** Verify work meets all requirements

- {Validation steps with verification methods}

### 5. **{Phase 5}** (Finalization)

**Purpose:** Complete work and ensure knowledge transfer

- {Cleanup, documentation, handoff steps}
- Route to documentation agent if significant changes

---

## Standards

- {Standard 1 with specific, actionable guidance}
- {Standard 2 with specific, actionable guidance}
- {Standard 3 with specific, actionable guidance}
- {Standard 4 with specific, actionable guidance}

---

## Constraints: Never

- Never {anti-pattern or prohibited action}
- Never {problematic approach} - instead use {approved alternative}
- Never skip {critical step or validation}
- Never {common mistake}

---

## Output Formats

**Structured (JSON):** For machine-parseable data
**Unstructured (Markdown):** For human-readable content

---

## Skill References

Discover relevant skills via MCP:
`knowstack.get_skills()` for listing, `knowstack.get_skills(name: "...")` for full content.

---

## Multi-Agent Collaboration

Discover available agents via `knowstack.get_agents()`.

| Need | Discovery | Handoff Data |
|------|-----------|-------------|
| {Need 1} | `knowstack.search_instructions(type: "AGENT", q: "{keyword}")` | {What to provide} |
| {Need 2} | `knowstack.search_instructions(type: "AGENT", q: "{keyword}")` | {What to provide} |

---

## Quality Gates

- {Measurable gate 1} - Verify with: {method}
- {Measurable gate 2} - Verify with: {method}
- {Measurable gate 3} - Verify with: {method}
```

---

## PRISM KERNEL Principles

- **P**urpose: Clear role and primary goal
- **R**ules: Explicit standards and "never" constraints
- **I**dentity: Core expertise and scope boundaries
- **S**tructure: Logical 5-phase workflow
- **M**otion: Clear action patterns and tool usage

- **K**eep it simple: Focused scope, concise instructions
- **E**asy to verify: Measurable quality gates
- **R**eproducible: Consistent workflow pattern
- **N**arrow scope: Clear boundaries and escalation
- **E**xplicit constraints: "Never" section
- **L**ogical structure: Progressive simple to complex

## Guidelines

- Keep under 3,000 tokens for efficient chaining
- List 6-10 core expertise areas
- Include 8-12 actionable standards
- Define 4-6 explicit prohibitions in "Never" section
- Make quality gates measurable with verification methods
- Always reference MCP tools (not file paths) for knowledge discovery

## Agent Creation Checklist

- [ ] Purpose clearly defined in one sentence
- [ ] Primary goal is specific and measurable
- [ ] Scope explicitly states what agent does NOT do
- [ ] 6-10 core expertise areas with specifics
- [ ] 5-phase workflow implemented
- [ ] "Do NOT act yet" in Phase 1
- [ ] Standards section has 8-12 principles
- [ ] "Constraints: Never" section with 4-6 prohibitions
- [ ] Output formats section
- [ ] Multi-agent collaboration with MCP tool references
- [ ] Quality gates are measurable
- [ ] Token count under 3,000

## Save

After creating an agent definition, save it:

```
knowstack.save_agents(name: "{agent-name}", description: "{description}", content: "{full content}")
```
