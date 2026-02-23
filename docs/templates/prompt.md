---
name: prompt
description: Refines raw user input into structured prompts. Use when starting a new task, converting ideas into actionable instructions, or preparing input for the planner workflow.
---

# Prompt Refinement Template

Transforms a raw user request into a clear, structured prompt ready for the request or plan workflow.

## When to Use

- User provides a vague or informal request
- Starting a new feature, bug fix, or refactoring task
- Preparing input for the planner agent workflow

## Prompt Structure

Take the user's raw input and produce a structured prompt with these sections:

### 1. Task

```
[Clear, specific description of what needs to be done]
```

### 2. Context

Gather project context before refining:

- **Existing patterns**: Discover via `knowstack.get_skills()` and `knowstack.get_documents()`
- **Available agents**: List via `knowstack.get_agents()` for specialist assignment
- **Project knowledge**: Query via `knowstack.query(query: "{relevant topic}")`

```
- Project: {PROJECT_NAME} - {brief description}
- Technology stack: {STACK}
- Architecture style: {STYLE}
- Current state: {relevant context}
```

### 3. Scope and Constraints

```
- Follow existing project architecture conventions
- Follow existing dependency injection patterns
- {Additional constraint from user or project context}
```

### 4. Expert Assignment

Discover and assign relevant agents:

```
knowstack.get_agents()  # List available specialists
```

- @{agent-name}: {focus area}
- @{agent-name}: {focus area}

### 5. Knowledge References

Discover and reference relevant skills:

```
knowstack.get_skills()  # List available skills
```

- /{skill-name}: {relevant patterns}
- /{skill-name}: {relevant patterns}

## Quality Checklist

- [ ] Task description is specific enough to produce a focused outcome
- [ ] Context describes the project and relevant state
- [ ] Constraints are explicit (not implied or assumed)
- [ ] Expert assignments reference available agents
- [ ] Knowledge references point to available skills

## Next Step

Proceed to request structuring:

```
knowstack.get_templates(name: "request")
```

Use the refined prompt as input for the request template to create a formal, structured request with goals, acceptance criteria, and verification plans.

## Tips

- **Be specific over verbose**: "Add pagination to document listing" beats "improve the documents feature"
- **Set explicit boundaries**: Tell what should and should NOT be done
- **Reference existing patterns**: Prompts grounded in existing code produce more consistent results
- **Assign expertise**: Reference agents and skills for domain-specific focus
