import { Controller, Get, Header, Inject } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import {
  IMetricsService,
  METRICS_SERVICE,
} from '@/core/interfaces/services/observability.interface';

/**
 * Prometheus metrics endpoint.
 * Unauthenticated - meant for scraping by Prometheus or similar.
 */
@Controller('metrics')
export class MetricsController {
  constructor(
    @Inject(METRICS_SERVICE)
    private readonly metrics: IMetricsService,
  ) {}

  @Get()
  @Public()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(): string {
    return this.metrics.getMetrics();
  }
}
