/**
 * Express Request type augmentations.
 * Extends Express Request to include tenant context.
 */

import type { TenantContext } from '@/common/types/tenant-context.type';

declare global {
  namespace Express {
    interface Request {
      /** Tenant context from ConfigTenantMiddleware */
      tenantContext?: TenantContext;
    }
  }
}
