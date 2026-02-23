---
name: plan
description: Generates phased execution plans with memory management. Use when creating implementation roadmaps, decomposing complex tasks into phases, or building plans with context persistence across phases.
---

# Plan Generation Template

Transforms a structured request into a phased execution plan with task dependencies, agent assignments, memory management, and actionable next steps.

## When to Use

- After structuring a request via the request template
- Planning multi-phase implementation work
- Decomposing complex tasks that require context persistence

## Plan Structure

```markdown
# Plan: {Title}

## Summary

{1-2 sentence overview of what this plan achieves}

## Prerequisites

- [ ] {Requirement that must be met before starting}

## Phase 1: {Phase Name}

**Goal:** {What this phase achieves}
**Agent:** {Specialist from `knowstack.get_agents()`}
**Skills:** {Relevant from `knowstack.get_skills()`}

### Tasks

1. [ ] **{Task Title}**
   - Description: {What to do}
   - Files: {Affected files}
   - Output: {Expected deliverable}
   - Depends on: {Task IDs or "none"}

2. [ ] **{Task Title}**
   ...

### Memory Checkpoint

Save phase results for context persistence:
`knowstack.save_memory(name: "plan-{id}-phase-1", content: "{phase summary and outputs}")`

## Phase 2: {Phase Name}

**Goal:** {What this phase achieves}
**Agent:** {Specialist}

### Resume Context

Load previous phase context:
`knowstack.get_memory(name: "plan-{id}-phase-1")`

### Tasks
...

### Memory Checkpoint
`knowstack.save_memory(name: "plan-{id}-phase-2", content: "{phase summary}")`

## Parallel Execution Opportunities

- Tasks [X, Y] can run concurrently
- Task [Z] blocks [A, B]

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| {Risk} | High/Med/Low | {Strategy} |

## Quality Gates

- [ ] {Checkpoint 1}
- [ ] {Checkpoint 2}

## Verification

{Commands or procedures to verify the plan was executed correctly}
```

---

## Planning Principles

### Task Decomposition (MECE)

- **Mutually Exclusive**: Each subtask covers a distinct portion of work
- **Collectively Exhaustive**: Together, all subtasks complete the full scope
- **Atomic Tasks**: Single-responsibility, estimable, verifiable, independent

### Dependency Notation

```
Task A ──────┐
             ├──► Task C (blocked by A and B)
Task B ──────┘

Task D ┬──► Task E  (parallel execution)
       └──► Task F
```

### Complexity Classification

| Complexity | Tasks | Phases | Agents |
|------------|-------|--------|--------|
| Simple | 1-3 | 1 | 1 |
| Moderate | 4-8 | 2 | 1-2 |
| Complex | 9-15 | 3-4 | 2-3 |
| Epic | 15+ | 5+ | 3+ |

---

## Memory Management

Plans should instruct the AI to persist context between phases to avoid losing progress.

### Save Phase Results

```
knowstack.save_memory(name: "plan-{id}-phase-{n}", content: "...")
```

### Resume from Phase

```
knowstack.get_memory(name: "plan-{id}-phase-{n}")
```

### Update In-Progress Phase

```
knowstack.update_memory(name: "plan-{id}-phase-{n}", old_str: "...", new_str: "...")
```

### Clean Up After Completion

```
knowstack.delete_memory(name: "plan-{id}-phase-{n}")
```

---

## Agent Assignment

Discover available specialists for each phase:

```
knowstack.get_agents()  # List all agents
```

Common phase-to-agent mapping:

| Phase Type | Agent Capability | Discovery |
|------------|-----------------|-----------|
| Design | Architecture specialist | `knowstack.search_instructions(type: "AGENT", q: "architecture")` |
| Implementation | Developer specialist | `knowstack.search_instructions(type: "AGENT", q: "developer")` |
| Testing | DevOps/testing specialist | `knowstack.search_instructions(type: "AGENT", q: "devops")` |
| Documentation | Documentation specialist | `knowstack.search_instructions(type: "AGENT", q: "documentation")` |
| Security review | Security specialist | `knowstack.search_instructions(type: "AGENT", q: "security")` |

---

## Actionable Next Steps

Every plan should end with concrete next steps telling the AI which MCP tools to call:

### For Feature Implementation

```
1. knowstack.save_memory(name: "plan-{id}", content: "{full plan}")
2. Begin Phase 1 tasks
3. knowstack.save_memory(name: "plan-{id}-phase-1", content: "{results}")
4. Continue to Phase 2...
```

### For Creating Instructions

| Use Case | Template | Save Tool |
|----------|----------|-----------|
| Create an agent | `knowstack.get_templates(name: "agent")` | `knowstack.save_agents(...)` |
| Create a skill | `knowstack.get_templates(name: "skill")` | `knowstack.save_skills(...)` |
| Create a command | N/A (use existing patterns) | `knowstack.save_commands(...)` |

---

## Validation Checklist

- [ ] All requirements from request captured
- [ ] Tasks decomposed to atomic, actionable level
- [ ] Dependencies explicitly mapped (no circular dependencies)
- [ ] Each task has clear acceptance criteria
- [ ] Parallel execution opportunities identified
- [ ] Responsible agent assigned per phase
- [ ] Risks identified with mitigation strategies
- [ ] Memory checkpoints defined between phases
- [ ] Plan follows existing project patterns
- [ ] Verification steps are executable

---

## Persistence

Save the complete plan to memory:

```
knowstack.save_memory(name: "plan-{identifier}", content: "{plan content}")
```
