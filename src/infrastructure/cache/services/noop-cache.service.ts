import { Injectable } from '@nestjs/common';
import { ICacheService } from '@/core/interfaces/services/cache.interface';

/**
 * No-op cache service implementation.
 * Used for testing or when caching is disabled.
 * All operations are silent no-ops that return default values.
 */
@Injectable()
export class NoOpCacheService implements ICacheService {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set<T>(_key: string, _value: T, _ttlSeconds?: number): Promise<void> {
    // No-op
  }

  async del(_key: string): Promise<void> {
    // No-op
  }

  async delByPattern(_pattern: string): Promise<number> {
    return 0;
  }

  async incr(_key: string): Promise<number> {
    return 0;
  }

  async expire(_key: string, _ttlSeconds: number): Promise<boolean> {
    return false;
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
