import { Injectable, Inject, Logger } from '@nestjs/common';
import { ICacheService, CACHE_SERVICE } from '@/core/interfaces/services/cache.interface';
import { getProjectCachePattern } from '@/common/utils/cache-key.util';

export const CACHE_INVALIDATION_SERVICE = Symbol('CACHE_INVALIDATION_SERVICE');

/**
 * Cache Invalidation Service.
 *
 * Application-layer service that coordinates cache behavior.
 * This is NOT a domain concern - it orchestrates cache operations
 * through the ICacheService abstraction.
 */
@Injectable()
export class CacheInvalidationService {
  private readonly logger = new Logger(CacheInvalidationService.name);

  constructor(
    @Inject(CACHE_SERVICE)
    private readonly cacheService: ICacheService,
  ) {}

  /**
   * Invalidate all query cache entries for a project.
   * Called when documents are created, updated, or deleted.
   *
   * @param projectId - The project ID whose cache should be invalidated.
   */
  async invalidateProjectCache(projectId: string): Promise<void> {
    const pattern = getProjectCachePattern(projectId);

    try {
      const deleted = await this.cacheService.delByPattern(pattern);
      if (deleted > 0) {
        this.logger.log(`Invalidated ${deleted} cache entries for project ${projectId}`);
      }
    } catch (err) {
      this.logger.warn(
        `Failed to invalidate cache for project ${projectId}: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
