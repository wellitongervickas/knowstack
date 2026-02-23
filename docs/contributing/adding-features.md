[Home](../index.md) > [Contributing](index.md) > **Adding Features**

# Adding Features

Step-by-step guides for adding new code to KnowStack.

## Adding a New MCP Tool

KnowStack exposes all functionality through MCP tools. There are no REST controllers for business logic.

### 1. Create DTOs / Zod Schemas

Define the tool's parameter schema in `application/mcp/dto/mcp-tool-schemas.ts`:

```typescript
// Add to src/application/mcp/dto/mcp-tool-schemas.ts
export const ExampleToolParams = {
  name: z.string().min(1).max(100).describe('Resource name'),
  limit: z.number().int().min(1).max(50).optional().describe('Max results'),
};
```

### 2. Create Application Service

Add business logic in `application/{feature}/services/`:

```typescript
// src/application/example/services/example.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { EXAMPLE_REPOSITORY, IExampleRepository } from '@core/interfaces/repositories';
import { TenantContextService } from '@common/services';

@Injectable()
export class ExampleService {
  constructor(
    @Inject(EXAMPLE_REPOSITORY)
    private readonly exampleRepository: IExampleRepository,
    private readonly tenantContext: TenantContextService,
  ) {}

  async create(dto: ExampleRequestDto): Promise<ExampleResponseDto> {
    const projectId = this.tenantContext.getProjectId();

    return this.exampleRepository.create({
      ...dto,
      projectId,
    });
  }
}
```

### 3. Add Tool Handler

Add a handler method in `McpToolHandlerService` (`application/mcp/services/mcp-tool-handler.service.ts`):

```typescript
async handleExample(args: { name: string; limit?: number }): Promise<McpToolResult> {
  const projectId = this.tenantContext.getProjectId();
  this.logger.info('MCP tool invoked', { tool: MCP_TOOL_EXAMPLE, projectId });

  try {
    const result = await this.exampleService.findByName(args.name, args.limit);
    return this.success(JSON.stringify(result));
  } catch (error) {
    return this.handleError(MCP_TOOL_EXAMPLE, projectId, error);
  }
}
```

### 4. Register Tool Constants

Add tool name and description in `application/mcp/mcp.constants.ts`:

```typescript
export const MCP_TOOL_EXAMPLE = 'knowstack.example';
export const MCP_TOOL_EXAMPLE_DESCRIPTION = 'Short description of what the tool does';
```

### 5. Register Tool in Server Factory

Wire the tool in `infrastructure/mcp/mcp-server.factory.ts`:

```typescript
server.registerTool(
  MCP_TOOL_EXAMPLE,
  {
    description: MCP_TOOL_EXAMPLE_DESCRIPTION,
    inputSchema: ExampleToolParams,
  },
  async ({ args }) => toolHandler.handleExample(args),
);
```

### 6. Wire in Module

Ensure new services are provided in the relevant module and injected into `McpToolHandlerService`.

## Adding a Repository

### 1. Define Interface

In `core/interfaces/repositories/`:

```typescript
// src/core/interfaces/repositories/example.repository.interface.ts
export interface IExampleRepository {
  findById(id: string): Promise<Example | null>;
  findByProjectId(projectId: string): Promise<Example[]>;
  create(data: CreateExampleData): Promise<Example>;
}

export const EXAMPLE_REPOSITORY = Symbol('EXAMPLE_REPOSITORY');
```

### 2. Implement Repository

In `infrastructure/database/repositories/`:

```typescript
// src/infrastructure/database/repositories/example.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import { IExampleRepository } from '@core/interfaces/repositories';

@Injectable()
export class ExampleRepository implements IExampleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Example | null> {
    return this.prisma.example.findUnique({ where: { id } });
  }

  async findByProjectId(projectId: string): Promise<Example[]> {
    return this.prisma.example.findMany({ where: { projectId } });
  }

  async create(data: CreateExampleData): Promise<Example> {
    return this.prisma.example.create({ data });
  }
}
```

### 3. Register in Module

Bind the interface to implementation:

```typescript
providers: [
  {
    provide: EXAMPLE_REPOSITORY,
    useClass: ExampleRepository,
  },
],
```

## Adding a Service

For business logic that doesn't need a repository:

```typescript
// src/application/example/services/calculator.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class CalculatorService {
  calculate(input: number): number {
    return input * 2;
  }
}
```

Register in module's `providers` array and use via constructor injection.

## See Also

- [Architecture Overview](../explanation/architecture/overview.md)
- [Patterns](../explanation/architecture/patterns.md)
