---
name: request
description: Structures prompts into formal requests with goals, acceptance criteria, and references. Use when converting a refined prompt into a detailed, structured request using the GOLDEN framework.
---

# Request Template (GOLDEN Framework)

Transforms a refined prompt into a structured request document with clear goals, constraints, acceptance criteria, and verification plans.

## When to Use

- After refining a prompt via the prompt template
- Creating a formal specification for a feature, refactoring, bug fix, or integration
- Preparing input for the plan template

## Framework: GOLDEN

| Section    | Purpose                                      | Required |
| ---------- | -------------------------------------------- | -------- |
| **Goal**   | Objective and success criteria               | Yes      |
| **Output** | Expected deliverables and format             | Yes      |
| **Limits** | Scope boundaries, constraints, rules         | Yes      |
| **Data**   | Context, examples, existing patterns         | Yes      |
| **Eval**   | Acceptance criteria and verification methods | Yes      |
| **Next**   | Follow-up actions and alternatives           | Optional |

---

## Request Template

```markdown
# Request: {Title}

## GOAL

### Objective

{One clear paragraph describing what this unlocks}

### Success Criteria

- [ ] {Measurable outcome 1}
- [ ] {Measurable outcome 2}
- [ ] {Measurable outcome 3}

---

## OUTPUT

### Expected Deliverables

- Implementation plan
- API/tool specifications
- Data model changes
- File list (create/modify)
- Test strategy

---

## LIMITS

### Scope: BUILD NOW

- {Feature/change 1}
- {Feature/change 2}

### Scope: DEFERRED

- {Explicitly excluded feature}

### Constraints

- {Technical constraint}
- {Security constraint}

### Boundaries

#### ALWAYS

- Follow project architecture conventions
- Follow existing dependency injection patterns
- Include tests for new logic

#### ASK FIRST

- Before creating new patterns not in existing codebase
- Before modifying shared interfaces

#### NEVER

- No unused code or speculative abstractions
- No business logic in presentation layer
- No hardcoded secrets

---

## DATA

### Context

{PROJECT_NAME} is a {brief description}.

Current state: {relevant background}

This request introduces: {brief description of new capability}

### Required Reading

Before planning, gather context:

- Discover skills: `knowstack.get_skills()`
- Discover agents: `knowstack.get_agents()`
- Query docs: `knowstack.query(query: "{relevant topic}")`
- Browse docs: `knowstack.get_documents()`

### Relevant Skills

- /{skill-name}: {relevant patterns}

### Agents to Involve

- @{agent-name}: {focus area}

---

## EVAL

### Acceptance Criteria

- [ ] {Testable criterion 1}
- [ ] {Testable criterion 2}
- [ ] {Testable criterion 3}
- [ ] All tests pass
- [ ] Build passes without errors

### Verification Plan

{Step-by-step verification commands or procedures}

---

## NEXT

### After This Version

- {Next logical follow-up}

### If Blocked

1. Document the blocker explicitly
2. Make reasonable assumptions and document them
3. Only ask follow-up questions if absolutely necessary
```

---

## Request Types

Use the template above as base. Adjust emphasis by request type:

| Type | Focus Areas |
|------|-------------|
| **Feature** | API contracts, data model, scope tiers (BUILD NOW/SCAFFOLD/DEFERRED) |
| **Refactor** | Behavior preservation, incremental steps, rollback strategy |
| **Bug Fix** | Reproduction steps, root cause, regression test |
| **Integration** | Auth flow, rate limits, graceful degradation |

---

## Three-Tier Boundary Framework

Every request should define boundaries:

- **ALWAYS**: Actions taken automatically without approval
- **ASK FIRST**: High-impact changes needing human review
- **NEVER**: Prohibited actions (hard stops)

---

## Quality Checklist

- [ ] Goal is specific and measurable
- [ ] Scope explicitly states what IS and IS NOT included
- [ ] Constraints are explicit (not implied)
- [ ] Context references existing patterns (via MCP tools)
- [ ] Acceptance criteria are testable
- [ ] No ambiguous terms without definition
- [ ] Dependencies/blockers identified
- [ ] Security considerations addressed

---

## Persistence

Save the structured request to memory for reference during planning:

```
knowstack.save_memory(name: "request-{identifier}", content: "{request content}")
```

## Next Step

Proceed to plan generation:

```
knowstack.get_templates(name: "plan")
```

Use the structured request as input for the plan template to generate a phased execution plan.
