import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ICacheService } from '@/core/interfaces/services/cache.interface';
import { RedisConfig } from '@/infrastructure/config/redis.config';

/**
 * Redis-based cache service implementation.
 * Provides caching with TTL, pattern deletion, and atomic counters.
 */
@Injectable()
export class RedisService implements ICacheService, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis;
  private readonly defaultTtl: number;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const config = this.configService.get<RedisConfig>('redis')!;
    this.defaultTtl = config.defaultTtlSeconds;
    this.enabled = config.cacheEnabled;

    this.client = new Redis(config.url, {
      lazyConnect: true,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
    });

    this.client.on('error', (err) => {
      this.logger.error(`Redis connection error: ${err.message}`);
    });

    this.client.on('connect', () => {
      this.logger.log('Redis connected');
    });

    // Connect lazily on first operation
    this.client.connect().catch((err) => {
      this.logger.error(`Redis initial connection failed: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Redis connection closed');
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.enabled) return null;

    try {
      const value = await this.client.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (err) {
      this.logger.warn(
        `Cache get failed for key ${key}: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (!this.enabled) return;

    try {
      const ttl = ttlSeconds ?? this.defaultTtl;
      await this.client.setex(key, ttl, JSON.stringify(value));
    } catch (err) {
      this.logger.warn(
        `Cache set failed for key ${key}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async del(key: string): Promise<void> {
    if (!this.enabled) return;

    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(
        `Cache del failed for key ${key}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async delByPattern(pattern: string): Promise<number> {
    if (!this.enabled) return 0;

    try {
      let cursor = '0';
      let totalDeleted = 0;

      do {
        const [nextCursor, keys] = await this.client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;

        if (keys.length > 0) {
          const deleted = await this.client.del(...keys);
          totalDeleted += deleted;
        }
      } while (cursor !== '0');

      return totalDeleted;
    } catch (err) {
      this.logger.warn(
        `Cache delByPattern failed for ${pattern}: ${err instanceof Error ? err.message : err}`,
      );
      return 0;
    }
  }

  async incr(key: string): Promise<number> {
    if (!this.enabled) return 0;

    try {
      return await this.client.incr(key);
    } catch (err) {
      this.logger.warn(
        `Cache incr failed for key ${key}: ${err instanceof Error ? err.message : err}`,
      );
      return 0;
    }
  }

  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      const result = await this.client.expire(key, ttlSeconds);
      return result === 1;
    } catch (err) {
      this.logger.warn(
        `Cache expire failed for key ${key}: ${err instanceof Error ? err.message : err}`,
      );
      return false;
    }
  }

  async isHealthy(): Promise<boolean> {
    if (!this.enabled) return true;

    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch {
      return false;
    }
  }

  /**
   * Set a value only if the key does not exist (atomic lock).
   * Uses SET with NX and EX options for atomic lock acquisition.
   *
   * @param key - Redis key
   * @param value - Value to set
   * @param ttlSeconds - TTL for the lock
   * @returns true if key was set (lock acquired), false if key already exists
   */
  async setNX<T>(key: string, value: T, ttlSeconds: number): Promise<boolean> {
    if (!this.enabled) return true; // In disabled mode, always succeed

    try {
      // SET key value NX EX ttlSeconds
      // Returns 'OK' if set, null if key exists
      const result = await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err) {
      this.logger.warn(
        `Cache setNX failed for key ${key}: ${err instanceof Error ? err.message : err}`,
      );
      return false;
    }
  }
}
