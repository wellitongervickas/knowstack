import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '@/common/types/tenant-context.type';

/**
 * Parameter decorator to inject the current tenant context.
 *
 * @example
 * // Get full context
 * @Get('query')
 * query(@Tenant() ctx: TenantContext) { ... }
 *
 * @example
 * // Get specific property
 * @Get('query')
 * query(@Tenant('organization') org: TenantContext['organization']) { ... }
 */
export const Tenant = createParamDecorator(
  (
    data: keyof TenantContext | undefined,
    ctx: ExecutionContext,
  ): TenantContext | TenantContext[keyof TenantContext] | null => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext: TenantContext | undefined = request.tenantContext;

    if (!tenantContext) {
      return null;
    }

    return data ? tenantContext[data] : tenantContext;
  },
);
