[Home](../index.md) > **Agents**

# Agent Definitions

AI agent instruction definitions for KnowStack. These are seeded as PUBLIC instructions and available to all projects via the `knowstack.get_agents` MCP tool.

## Available Agents

| Agent | Model | Description |
|-------|-------|-------------|
| [planner](planner.md) | opus | Strategic planner and workflow orchestrator |
| [product](product.md) | sonnet | Product designer for requirements and user stories |
| [docs](docs.md) | haiku | Documentation writer following Diataxis framework |
| [developer](developer.md) | sonnet | Implementation specialist for TypeScript APIs |
| [debugger](debugger.md) | sonnet | Debugging specialist for errors and bugs |
| [devops](devops.md) | sonnet | DevOps and testing specialist |
| [architect](architect.md) | opus | System architect for Clean Architecture and DDD |
| [security](security.md) | opus | Security auditor for OWASP compliance |

## How Agents Work

Agent instructions are stored in the database as `Instruction` entities with `type = AGENT` and `visibility = PUBLIC`. Any MCP client can retrieve them via the `knowstack.get_agents` tool.

Projects can create private agent instructions that override or extend the public defaults.

## See Also

- [Architecture Overview](../explanation/architecture/overview.md)
