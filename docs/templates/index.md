[Home](../index.md) > **Templates**

# Template Definitions

Reusable templates for structured AI workflows delivered via MCP protocol. Templates provide consistent patterns for planning, requesting, and creating AI instructions across any MCP-compatible tool.

## Retrieval

```
knowstack.get_templates()                    # List all templates
knowstack.get_templates(name: "prompt")      # Get full template content
knowstack.search_instructions(q: "template") # Search across all types
```

## Available Templates

### Workflow Templates

| Template | Description |
|----------|-------------|
| [prompt](prompt.md) | Refines raw user input into structured prompts |
| [request](request.md) | Structures prompts into formal requests (GOLDEN framework) |
| [plan](plan.md) | Generates phased execution plans with memory management |

### Definition Templates

| Template | Description |
|----------|-------------|
| [agent](agent.md) | PRISM KERNEL template for creating agent definitions |
| [skill](skill.md) | Agent Skills spec template for creating skill definitions |

## Visibility

Templates are seeded as **PUBLIC** (shared across all projects). Projects can override with PRIVATE versions using `knowstack.save_templates`.

## See Also

- [Agent Definitions](../agents/index.md)
- [Skill Definitions](../skills/index.md)
- [Command Definitions](../commands/index.md)
