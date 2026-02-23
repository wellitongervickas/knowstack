import { Module } from '@nestjs/common';
import { SlugService } from './services/slug.service';

/**
 * Common Module.
 * Provides shared application services.
 */
@Module({
  providers: [SlugService],
  exports: [SlugService],
})
export class CommonModule {}
