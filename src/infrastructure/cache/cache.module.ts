import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { redisConfig } from '@/infrastructure/config/redis.config';
import { CACHE_SERVICE } from '@/core/interfaces/services/cache.interface';
import { RedisService } from './services/redis.service';
import { NoOpCacheService } from './services/noop-cache.service';

/**
 * Global cache module providing Redis-based caching.
 * Marked as @Global() to be available across all modules without explicit imports.
 */
@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [
    RedisService,
    NoOpCacheService,
    {
      provide: CACHE_SERVICE,
      useExisting: RedisService,
    },
  ],
  exports: [CACHE_SERVICE, RedisService],
})
export class CacheModule {}
