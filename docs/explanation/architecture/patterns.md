[Home](../../index.md) > [Explanation](../index.md) > [Architecture](index.md) > **Patterns**

# Patterns

Key patterns used in KnowStack.

## Dependency Injection with Symbols

Use Symbol tokens for interface-based injection:

```typescript
// 1. Define in core/interfaces
export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');

export interface IDocumentRepository {
  findByProjectId(projectId: string): Promise<Document[]>;
}

// 2. Implement in infrastructure
@Injectable()
export class DocumentRepository implements IDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProjectId(projectId: string): Promise<Document[]> {
    return this.prisma.document.findMany({ where: { projectId } });
  }
}

// 3. Inject in services
@Injectable()
export class DocumentService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
  ) {}
}

// 4. Bind in module
providers: [
  {
    provide: DOCUMENT_REPOSITORY,
    useClass: DocumentRepository,
  },
];
```

**Why:** Easy mocking for tests, swap implementations without changing consumers.

## Tenant Context

Request-scoped tenant information using `nestjs-cls`.

### How it Works

1. `ConfigTenantMiddleware` reads `x-ks-org` and `x-ks-project` headers
2. Middleware resolves slugs to organization and project IDs (auto-creates if needed)
3. `TenantContextService` stores context (uses AsyncLocalStorage via `nestjs-cls`)
4. `@Tenant()` decorator injects context into controllers

### Using in Controllers

```typescript
@Post()
async query(
  @Body() request: QueryRequestDto,
  @Tenant() tenant: TenantContext,
): Promise<QueryResponseDto> {
  // tenant.project.id, tenant.organization.id available
  return this.queryService.execute(request, tenant);
}
```

### Using in Services

```typescript
@Injectable()
export class MyService {
  constructor(private readonly tenantContext: TenantContextService) {}

  async doSomething() {
    const projectId = this.tenantContext.getProjectId();
    const orgId = this.tenantContext.getOrganizationId();
    const hasScope = this.tenantContext.hasScope('admin');
  }
}
```

## @Tenant() Decorator

Inject tenant context into controller methods:

```typescript
// Full context
@Tenant() tenant: TenantContext

// Specific property
@Tenant('organization') org: Organization
@Tenant('project') project: Project
```

Tenant context is populated by `ConfigTenantMiddleware` from `x-ks-org` and `x-ks-project` headers.

## Pipeline Orchestration

The `QueryOrchestratorService` shows the pattern:

```typescript
@Injectable()
export class QueryOrchestratorService {
  constructor(
    private readonly documentService: DocumentService,
    private readonly contextBuilder: ContextBuilderService,
    @Inject(AI_PROVIDER) private readonly aiProvider: IAIProvider,
    private readonly responseFormatter: ResponseFormatterService,
  ) {}

  async execute(request: QueryRequestDto, tenant: TenantContext) {
    const startTime = Date.now();

    // 1. Fetch data
    const documents = await this.documentService.getDocumentsForProject(tenant.project.id);

    // 2. Build context
    const messages = this.contextBuilder.buildMessages(request.query, documents, request.context);

    // 3. Call external service
    const aiResponse = await this.aiProvider.complete({ messages, maxTokens: 1024 });

    // 4. Format response
    const latency = Date.now() - startTime;
    return this.responseFormatter.format(aiResponse, documents, latency);
  }
}
```

**Key points:**

- Each step is a single responsibility
- Dependencies are injected interfaces
- Side effects (usage tracking) don't block the response
- Easy to test each component

## AI Provider Factory Pattern

Support multiple AI providers with configuration-driven selection:

```typescript
// Injection tokens for each provider
export const STUB_AI_PROVIDER = Symbol('STUB_AI_PROVIDER');
export const OPENAI_PROVIDER = Symbol('OPENAI_PROVIDER');

// Factory manages provider registration and selection
@Injectable()
export class AIProviderFactory implements IAIProviderFactory, OnModuleInit {
  private readonly providers: Map<string, IAIProvider> = new Map();
  private readonly defaultProviderName: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(STUB_AI_PROVIDER) stubProvider: StubAIProvider,
    @Inject(OPENAI_PROVIDER) openaiProvider: OpenAIProvider,
  ) {
    this.providers.set(stubProvider.name, stubProvider);
    this.providers.set(openaiProvider.name, openaiProvider);
    this.defaultProviderName = configService.get('ai.defaultProvider') || 'stub';
  }

  getDefaultProvider(): IAIProvider {
    return this.providers.get(this.defaultProviderName);
  }
}
```

**Module wiring** - Factory resolves the default provider:

```typescript
providers: [
  { provide: STUB_AI_PROVIDER, useClass: StubAIProvider },
  { provide: OPENAI_PROVIDER, useClass: OpenAIProvider },
  { provide: AI_PROVIDER_FACTORY, useClass: AIProviderFactory },
  {
    provide: AI_PROVIDER,
    useFactory: (factory: AIProviderFactory) => factory.getDefaultProvider(),
    inject: [AIProviderFactory],
  },
];
```

**Configuration** via environment:

```bash
AI_DEFAULT_PROVIDER=openai  # or 'stub' for testing
OPENAI_API_KEY=sk-...
```

**Benefits:**

- Swap providers without code changes
- Stub provider for tests, OpenAI for production
- Fail-fast validation at startup

## Cache Graceful Degradation Pattern

The cache module provides graceful degradation when Redis is unavailable:

```typescript
// Cache service interface
export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  del(key: string): Promise<void>;
  isHealthy(): Promise<boolean>;
}

// Two implementations
@Injectable()
export class RedisService implements ICacheService {
  /* Real Redis */
}

@Injectable()
export class NoOpCacheService implements ICacheService {
  // No-op implementation for graceful degradation
  async get<T>(): Promise<T | null> {
    return null;
  }
  async set(): Promise<void> {
    /* no-op */
  }
  async del(): Promise<void> {
    /* no-op */
  }
  async isHealthy(): Promise<boolean> {
    return true;
  }
}
```

**Module selection:**

```typescript
providers: [
  {
    provide: CACHE_SERVICE,
    useFactory: (config) =>
      config.redis.enabled ? new RedisService(config) : new NoOpCacheService(),
    inject: [redisConfig.KEY],
  },
];
```

**Benefits:**

- Application works without Redis (development, testing)
- Cache misses handled gracefully
- No code changes needed in consumers

## Repository Pattern

Abstract data access behind interfaces:

```typescript
// Interface (what we need)
interface IDocumentRepository {
  findByProjectId(projectId: string): Promise<Document[]>;
}

// Implementation (how we do it)
class DocumentRepository implements IDocumentRepository {
  constructor(private prisma: PrismaService) {}

  async findByProjectId(projectId: string) {
    return this.prisma.document.findMany({ where: { projectId } });
  }
}
```

**Benefits:**

- Swap databases without changing services
- Easy mocking for unit tests
- Clear separation of concerns

## Coding Standards

### Import Paths

**Use `@/` aliases for imports from `src/`:**

```typescript
// GOOD - @/ alias for src imports
import { computeContentHash } from '@/common/utils/crypto.util';
import { DOCUMENT_REPOSITORY } from '@/core/interfaces/repositories/document.repository.interface';

// BAD - relative paths crossing module boundaries
import { computeContentHash } from '../../../common/utils/crypto.util';
```

**Why:** Consistent paths, easier refactoring, clearer dependencies.

### No Re-exports

**Import from source files, not through intermediate re-exports:**

```typescript
// GOOD - import from source
import { DOCUMENT_REPOSITORY } from '@/core/interfaces/repositories/document.repository.interface';

// BAD - re-export pattern
// In document.service.ts:
export { DOCUMENT_REPOSITORY } from '@/core/interfaces/...';

// Then importing from service:
import { DOCUMENT_REPOSITORY } from '@/application/documents/services/document.service';
```

**Why:** Clear dependency graph, easier to track where symbols are defined.

### Configuration & Constants Location

**Application-level configuration at `src/` root:**

```
src/
  app.constants.ts  # Shared constants: APP_VERSION, USER_AGENT, time conversions
  app.settings.ts   # Environment settings: parsed from process.env
```

**Module-specific constants colocated with their module (follow `[domain].constants.ts` naming):**

```
src/application/security/security.constants.ts           # Security headers
src/common/constants/                                    # Shared constant modules
```

**Shared utilities in `@/common/utils/`:**

```
src/common/utils/
  crypto.util.ts   # Hash functions, content normalization
  index.ts         # Barrel export
```

**Never duplicate utilities.** If the same logic exists in two places, extract appropriately.

### Constants Over Magic Values

**Use constants from appropriate locations:**

- **Shared constants:** `@/app.constants` - app metadata, time conversions, HTTP defaults
- **Module constants:** `@/application/{module}/{domain}.constants` or `@/infrastructure/{module}/{domain}.constants`

```typescript
// GOOD - shared constants from app root
import { USER_AGENT, DEFAULT_FETCH_TIMEOUT_MS } from '@/app.constants';

const response = await fetch(url, {
  headers: { 'User-Agent': USER_AGENT },
});

// GOOD - module-specific constants ([domain].constants.ts naming)
import { SECURITY_HEADERS } from '@/application/security/security.constants';

// BAD - hardcoded values
const response = await fetch(url, {
  headers: { 'User-Agent': 'KnowStack/0.2.0' },
});
```

### Symbol Tokens

**Define injection tokens in interface files, not service files:**

```typescript
// GOOD - in core/interfaces/repositories/document.repository.interface.ts
export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
export interface IDocumentRepository { ... }

// BAD - in application/documents/services/document.service.ts
export const DOCUMENT_REPOSITORY = Symbol('DOCUMENT_REPOSITORY');
```

## Constants vs Settings

Two files serve different purposes:

**`constants.ts`** - Static values that never change per environment:

```typescript
export const APP_VERSION = '0.3.0';
export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;
```

**`settings.ts`** - Environment-configurable values:

```typescript
export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://localhost:5432/knowstack';
export const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
```

**Rule:** If a value should change between dev/staging/prod, put it in `settings.ts` and read from `process.env`.

## See Also

- [Architecture Overview](overview.md)
- [Adding Features](../../contributing/adding-features.md)
