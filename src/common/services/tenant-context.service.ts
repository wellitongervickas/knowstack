import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { TenantContext } from '@/common/types/tenant-context.type';
import { ResolvedContextProject } from '@/core/interfaces/config/knowstack-config.interface';

const TENANT_CONTEXT_KEY = 'tenantContext';

/**
 * Service for managing request-scoped tenant context.
 * Uses nestjs-cls (AsyncLocalStorage) to store tenant information
 * throughout the request lifecycle.
 *
 * In local-first mode, context is set by ConfigTenantMiddleware
 * based on HTTP headers (x-ks-org, x-ks-project).
 */
@Injectable()
export class TenantContextService {
  constructor(private readonly cls: ClsService) {}

  /**
   * Set the tenant context for the current request.
   * Called by ConfigTenantMiddleware after resolving headers.
   */
  setContext(context: TenantContext): void {
    this.cls.set(TENANT_CONTEXT_KEY, context);
  }

  /**
   * Get the tenant context for the current request.
   * Throws if context is not set (should never happen after middleware runs).
   */
  getContext(): TenantContext {
    const context = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
    if (!context) {
      throw new Error('TenantContext not initialized. Ensure ConfigTenantMiddleware has run.');
    }
    return context;
  }

  /**
   * Get the tenant context or null if not set.
   */
  getContextOrNull(): TenantContext | null {
    return this.cls.get<TenantContext>(TENANT_CONTEXT_KEY) ?? null;
  }

  /**
   * Get the organization ID from the current tenant context.
   */
  getOrganizationId(): string {
    return this.getContext().organization.id;
  }

  /**
   * Get the project ID from the current tenant context.
   * Always present in local-first mode.
   */
  getProjectId(): string {
    return this.getContext().project.id;
  }

  /**
   * Get resolved context projects, if any.
   */
  getContextProjects(): ResolvedContextProject[] {
    return this.getContext().contextProjects ?? [];
  }

  /**
   * Get context project IDs that have a specific instruction type enabled.
   */
  getContextProjectIdsForType(
    type: 'agents' | 'commands' | 'skills' | 'documents' | 'memory' | 'templates',
  ): { id: string; priorityOverParent: boolean }[] {
    return this.getContextProjects()
      .filter((cp) => {
        const config = cp.config[type];
        return config === true || (typeof config === 'object' && config !== null);
      })
      .map((cp) => {
        const config = cp.config[type];
        const priorityOverParent =
          typeof config === 'object' && config !== null ? config.priorityOverParent : false;
        return { id: cp.id, priorityOverParent };
      });
  }
}
