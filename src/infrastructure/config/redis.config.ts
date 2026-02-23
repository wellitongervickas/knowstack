import { registerAs } from '@nestjs/config';
import { REDIS_URL, REDIS_CACHE_TTL_SECONDS, REDIS_CACHE_ENABLED } from '@/app.settings';

export interface RedisConfig {
  url: string;
  defaultTtlSeconds: number;
  cacheEnabled: boolean;
}

export const redisConfig = registerAs(
  'redis',
  (): RedisConfig => ({
    url: REDIS_URL,
    defaultTtlSeconds: REDIS_CACHE_TTL_SECONDS,
    cacheEnabled: REDIS_CACHE_ENABLED,
  }),
);
