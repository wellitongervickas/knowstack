import { Global, Module } from '@nestjs/common';
import { RequestContextService } from '@/common/services/request-context.service';
import {
  STRUCTURED_LOGGER,
  METRICS_SERVICE,
  ERROR_REPORTER,
  NoOpErrorReporter,
} from '@/core/interfaces/services/observability.interface';
import { StructuredLoggerService } from './services/structured-logger.service';
import { MetricsService } from './services/metrics.service';
import { MetricsController } from './controllers/metrics.controller';

/**
 * Global observability module providing:
 * - RequestContextService for request ID and source tracking
 * - StructuredLoggerService for JSON logging
 * - MetricsService for Prometheus metrics
 * - MetricsController for /metrics endpoint
 *
 * Note: This module has no dependencies on presentation layer modules.
 * Auth context is provided via middleware, not module imports.
 */
@Global()
@Module({
  providers: [
    // Request context service
    RequestContextService,

    // Structured logger
    StructuredLoggerService,
    {
      provide: STRUCTURED_LOGGER,
      useExisting: StructuredLoggerService,
    },

    // Metrics service
    MetricsService,
    {
      provide: METRICS_SERVICE,
      useExisting: MetricsService,
    },

    // SCAFFOLD: Error reporter (no-op for now)
    {
      provide: ERROR_REPORTER,
      useClass: NoOpErrorReporter,
    },
  ],
  controllers: [MetricsController],
  exports: [
    RequestContextService,
    StructuredLoggerService,
    STRUCTURED_LOGGER,
    MetricsService,
    METRICS_SERVICE,
    ERROR_REPORTER,
  ],
})
export class ObservabilityModule {}
