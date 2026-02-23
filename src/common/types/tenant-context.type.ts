import { ResolvedContextProject } from '@/core/interfaces/config/knowstack-config.interface';

/**
 * TenantContext represents the resolved tenant information
 * from HTTP headers (x-ks-org, x-ks-project).
 * Available throughout the request lifecycle via ClsService.
 *
 * In local-first mode, context is resolved from config-derived headers.
 * No authentication — just tenant identification.
 */
export interface TenantContext {
  /** Current project (always present). */
  project: {
    id: string;
    slug: string;
  };

  /** Organization the project belongs to. */
  organization: {
    id: string;
    slug: string;
  };

  /** Resolved context projects for cross-project data sharing. */
  contextProjects?: ResolvedContextProject[];
}
