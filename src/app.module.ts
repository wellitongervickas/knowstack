import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';
import { aiConfig } from '@/infrastructure/config/ai.config';
import { redisConfig } from '@/infrastructure/config/redis.config';
import { embeddingConfig } from '@/infrastructure/config/embedding.config';
import { appConfig } from '@/infrastructure/config/app.config';
import { APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ClsModule } from 'nestjs-cls';

// Modules
import { ObservabilityModule } from '@/infrastructure/observability/observability.module';
import { CacheModule } from '@/infrastructure/cache/cache.module';
import { AuditModule } from '@/application/audit/audit.module';
import { McpModule } from '@/presentation/mcp/mcp.module';

// Middleware
import { RequestContextMiddleware } from '@/common/middleware/request-context.middleware';

// Interceptors
import { LoggingInterceptor } from '@/common/interceptors/logging.interceptor';
import { SecurityHeadersInterceptor } from '@/common/interceptors/security-headers.interceptor';

// Filters
import { GlobalExceptionFilter } from '@/common/filters/global-exception.filter';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [aiConfig, redisConfig, embeddingConfig, appConfig],
    }),

    // CLS Module for request-scoped tenant context
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
      },
    }),

    // Observability Module (logging, metrics)
    ObservabilityModule,

    // Cache Module (Redis)
    CacheModule,

    // Audit Logging
    AuditModule,

    // MCP Module — sole presentation layer
    McpModule,
  ],
  providers: [
    // Global Logging Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    // Global Security Headers Interceptor
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityHeadersInterceptor,
    },
    // Global Exception Filter
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Request context middleware runs first (requestId, source, etc.)
    consumer.apply(RequestContextMiddleware).forRoutes('*');

    // Config tenant middleware is registered in McpModule (where its dependencies are provided)
  }
}
