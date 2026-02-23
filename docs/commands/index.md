[Home](../index.md) > **Commands**

# Command Definitions

Reusable checklists and review templates for KnowStack. These are seeded as PUBLIC instructions and available to all projects via the `knowstack.get_commands` MCP tool.

## Available Commands

| Command | Description |
|---------|-------------|
| [code-review](code-review.md) | Code review checklist for pull requests |
| [commit-review](commit-review.md) | Commit message review guidelines |
| [dependency-check](dependency-check.md) | Dependency review and update checklist |
| [refactor-check](refactor-check.md) | Refactoring safety checklist |
| [sdk-release](sdk-release.md) | Build and publish @knowstack/sdk to npm |

## How Commands Work

Command instructions are stored in the database as `Instruction` entities with `type = COMMAND` and `visibility = PUBLIC`. Any MCP client can retrieve them via the `knowstack.get_commands` tool.

Projects can create private command instructions that override or extend the public defaults.

## See Also

- [Agent Definitions](../agents/index.md)
- [Skill Definitions](../skills/index.md)
- [Template Definitions](../templates/index.md)
