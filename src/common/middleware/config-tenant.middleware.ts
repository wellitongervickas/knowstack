import { Injectable, NestMiddleware, Inject, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantContextService } from '@/common/services/tenant-context.service';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '@/core/interfaces/repositories/organization.repository.interface';
import {
  IProjectRepository,
  PROJECT_REPOSITORY,
} from '@/core/interfaces/repositories/project.repository.interface';
import {
  ContextProjectConfig,
  ResolvedContextProject,
} from '@/core/interfaces/config/knowstack-config.interface';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
} from '@/core/interfaces/services/observability.interface';

/** Header names for config-driven tenant resolution. */
const HEADER_ORG = 'x-ks-org';
const HEADER_PROJECT = 'x-ks-project';
const HEADER_CONTEXT = 'x-ks-context';

/**
 * Middleware that resolves tenant context from HTTP headers.
 *
 * Replaces all auth guards in local-first mode.
 * Reads x-ks-org and x-ks-project headers, resolves slugs to IDs,
 * and sets TenantContext in ClsService for the request lifecycle.
 */
@Injectable()
export class ConfigTenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantContext: TenantContextService,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: IProjectRepository,
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const orgSlug = this.extractHeader(req, HEADER_ORG);
    const projectSlug = this.extractHeader(req, HEADER_PROJECT);

    if (!orgSlug || !projectSlug) {
      throw new BadRequestException(
        `Missing required headers: ${HEADER_ORG} and ${HEADER_PROJECT}`,
      );
    }

    // Resolve organization
    const organization = await this.organizationRepository.findBySlug(orgSlug);
    if (!organization) {
      throw new BadRequestException(`Organization not found: ${orgSlug}`);
    }

    // Resolve project within organization
    const project = await this.projectRepository.findBySlug(organization.id, projectSlug);
    if (!project) {
      throw new BadRequestException(`Project not found: ${projectSlug} in organization ${orgSlug}`);
    }

    // Resolve context projects (optional)
    const contextProjects = await this.resolveContextProjects(req, organization.id);

    this.tenantContext.setContext({
      organization: { id: organization.id, slug: organization.slug },
      project: { id: project.id, slug: project.slug },
      contextProjects,
    });

    this.logger.debug('Tenant context resolved', {
      orgSlug,
      projectSlug,
      contextProjectCount: contextProjects?.length ?? 0,
    });

    next();
  }

  private extractHeader(req: Request, name: string): string | undefined {
    const value = req.headers[name];
    return typeof value === 'string' && value.length > 0 ? value : undefined;
  }

  private async resolveContextProjects(
    req: Request,
    organizationId: string,
  ): Promise<ResolvedContextProject[] | undefined> {
    const contextHeader = this.extractHeader(req, HEADER_CONTEXT);
    if (!contextHeader) return undefined;

    let configs: ContextProjectConfig[];
    try {
      configs = JSON.parse(contextHeader);
    } catch {
      this.logger.warn('Invalid x-ks-context header, ignoring', { raw: contextHeader });
      return undefined;
    }

    if (!Array.isArray(configs) || configs.length === 0) return undefined;

    const resolved: ResolvedContextProject[] = [];
    for (const config of configs) {
      if (!config.name) continue;

      const project = await this.projectRepository.findBySlug(organizationId, config.name);
      if (project) {
        resolved.push({ id: project.id, slug: project.slug, config });
      } else {
        this.logger.warn('Context project not found, skipping', { slug: config.name });
      }
    }

    return resolved.length > 0 ? resolved : undefined;
  }
}
