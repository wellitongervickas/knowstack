import { Injectable, Inject } from '@nestjs/common';
import { DomainException } from '@/core/exceptions/domain.exception';
import {
  OrganizationNotFoundException,
  OrganizationSlugTakenException,
} from '@/core/exceptions/organization.exception';
import {
  ProjectNotFoundException,
  ProjectSlugTakenException,
} from '@/core/exceptions/project.exception';
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from '@/core/interfaces/repositories/organization.repository.interface';
import {
  IProjectRepository,
  PROJECT_REPOSITORY,
} from '@/core/interfaces/repositories/project.repository.interface';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
} from '@/core/interfaces/services/observability.interface';
import { McpToolResult } from '@/core/interfaces/mcp/mcp-server.interface';
import { Organization } from '@/core/entities/organization.entity';
import {
  MCP_TOOL_CREATE_ORGANIZATION,
  MCP_TOOL_GET_ORGANIZATION,
  MCP_TOOL_LIST_ORGANIZATIONS,
  MCP_TOOL_CREATE_PROJECT,
  MCP_TOOL_GET_PROJECT,
  MCP_TOOL_LIST_PROJECTS,
  MCP_ERROR_MESSAGES,
} from '@/application/mcp/mcp.constants';

/**
 * Handles admin MCP tools for organization and project management.
 * These tools operate outside tenant context — no TenantContextService dependency.
 */
@Injectable()
export class McpAdminToolHandlerService {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(PROJECT_REPOSITORY)
    private readonly projectRepository: IProjectRepository,
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
  ) {}

  // ─── Organizations ──────────────────────────────────────────────────────────

  async handleCreateOrganization(args: { name: string; slug: string }): Promise<McpToolResult> {
    this.logger.info('MCP admin tool invoked', { tool: MCP_TOOL_CREATE_ORGANIZATION });

    try {
      const slugTaken = await this.organizationRepository.isSlugTaken(args.slug);
      if (slugTaken) {
        throw new OrganizationSlugTakenException(args.slug);
      }

      const org = await this.organizationRepository.create({
        name: args.name,
        slug: args.slug,
      });

      return this.success({ id: org.id, name: org.name, slug: org.slug, status: 'created' });
    } catch (error) {
      return this.handleError(MCP_TOOL_CREATE_ORGANIZATION, error);
    }
  }

  async handleGetOrganization(args: { slug: string }): Promise<McpToolResult> {
    this.logger.info('MCP admin tool invoked', { tool: MCP_TOOL_GET_ORGANIZATION });

    try {
      const org = await this.resolveOrganization(args.slug);
      const orgWithStats = await this.organizationRepository.findByIdWithStats(org.id);

      return this.success({
        id: org.id,
        name: org.name,
        slug: org.slug,
        projectCount: orgWithStats?.projectCount ?? 0,
        createdAt: org.createdAt,
      });
    } catch (error) {
      return this.handleError(MCP_TOOL_GET_ORGANIZATION, error);
    }
  }

  async handleListOrganizations(): Promise<McpToolResult> {
    this.logger.info('MCP admin tool invoked', { tool: MCP_TOOL_LIST_ORGANIZATIONS });

    try {
      const orgs = await this.organizationRepository.findAll();
      return this.success(
        orgs.map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          createdAt: org.createdAt,
        })),
      );
    } catch (error) {
      return this.handleError(MCP_TOOL_LIST_ORGANIZATIONS, error);
    }
  }

  // ─── Projects ───────────────────────────────────────────────────────────────

  async handleCreateProject(args: {
    organizationSlug: string;
    name: string;
    slug: string;
  }): Promise<McpToolResult> {
    this.logger.info('MCP admin tool invoked', { tool: MCP_TOOL_CREATE_PROJECT });

    try {
      const org = await this.resolveOrganization(args.organizationSlug);
      const slugTaken = await this.projectRepository.isSlugTaken(org.id, args.slug);
      if (slugTaken) {
        throw new ProjectSlugTakenException(args.slug);
      }

      const project = await this.projectRepository.create({
        organizationId: org.id,
        name: args.name,
        slug: args.slug,
      });

      return this.success({
        id: project.id,
        organizationId: project.organizationId,
        name: project.name,
        slug: project.slug,
        status: 'created',
      });
    } catch (error) {
      return this.handleError(MCP_TOOL_CREATE_PROJECT, error);
    }
  }

  async handleGetProject(args: { organizationSlug: string; slug: string }): Promise<McpToolResult> {
    this.logger.info('MCP admin tool invoked', { tool: MCP_TOOL_GET_PROJECT });

    try {
      const org = await this.resolveOrganization(args.organizationSlug);
      const project = await this.projectRepository.findBySlug(org.id, args.slug);
      if (!project) {
        throw new ProjectNotFoundException();
      }

      return this.success({
        id: project.id,
        organizationId: project.organizationId,
        name: project.name,
        slug: project.slug,
        createdAt: project.createdAt,
      });
    } catch (error) {
      return this.handleError(MCP_TOOL_GET_PROJECT, error);
    }
  }

  async handleListProjects(args: { organizationSlug: string }): Promise<McpToolResult> {
    this.logger.info('MCP admin tool invoked', { tool: MCP_TOOL_LIST_PROJECTS });

    try {
      const org = await this.resolveOrganization(args.organizationSlug);
      const projects = await this.projectRepository.findByOrganizationId(org.id);

      return this.success(
        projects.map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          createdAt: p.createdAt,
        })),
      );
    } catch (error) {
      return this.handleError(MCP_TOOL_LIST_PROJECTS, error);
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async resolveOrganization(slug: string): Promise<Organization> {
    const org = await this.organizationRepository.findBySlug(slug);
    if (!org) {
      throw new OrganizationNotFoundException();
    }
    return org;
  }

  private success(data: unknown): McpToolResult {
    return { content: [{ type: 'text', text: JSON.stringify(data) }] };
  }

  private error(message: string): McpToolResult & { isError: true } {
    return { content: [{ type: 'text', text: message }], isError: true };
  }

  private handleError(tool: string, error: unknown): McpToolResult {
    this.logger.error(
      `MCP admin tool ${tool} failed`,
      error instanceof Error ? error : undefined,
      {} as Record<string, unknown>,
    );

    const message =
      error instanceof DomainException ? error.message : MCP_ERROR_MESSAGES.UNEXPECTED_ERROR;
    return this.error(message);
  }
}
