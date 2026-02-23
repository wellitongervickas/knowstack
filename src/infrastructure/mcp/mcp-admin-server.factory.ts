import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { IMcpServerFactory, IMcpServerSession } from '@/core/interfaces/mcp/mcp-server.interface';
import { McpAdminToolHandlerService } from '@/application/mcp/services/mcp-admin-tool-handler.service';
import {
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_TOOL_CREATE_ORGANIZATION,
  MCP_TOOL_CREATE_ORGANIZATION_DESCRIPTION,
  MCP_TOOL_GET_ORGANIZATION,
  MCP_TOOL_GET_ORGANIZATION_DESCRIPTION,
  MCP_TOOL_LIST_ORGANIZATIONS,
  MCP_TOOL_LIST_ORGANIZATIONS_DESCRIPTION,
  MCP_TOOL_CREATE_PROJECT,
  MCP_TOOL_CREATE_PROJECT_DESCRIPTION,
  MCP_TOOL_GET_PROJECT,
  MCP_TOOL_GET_PROJECT_DESCRIPTION,
  MCP_TOOL_LIST_PROJECTS,
  MCP_TOOL_LIST_PROJECTS_DESCRIPTION,
} from '@/application/mcp/mcp.constants';
import {
  CreateOrganizationToolParams,
  GetOrganizationToolParams,
  ListOrganizationsToolParams,
  CreateProjectToolParams,
  GetProjectToolParams,
  ListProjectsToolParams,
} from '@/application/mcp/dto/mcp-tool-schemas';

/**
 * MCP Admin Server Factory.
 *
 * Creates per-request MCP server instances with admin tools only.
 * No tenant context middleware — these tools manage organizations and projects.
 *
 * 6 admin tools for organization and project management.
 */
@Injectable()
export class McpAdminServerFactoryImpl implements IMcpServerFactory {
  constructor(private readonly toolHandler: McpAdminToolHandlerService) {}

  async create(): Promise<IMcpServerSession> {
    const server = new McpServer({
      name: `${MCP_SERVER_NAME}-admin`,
      version: MCP_SERVER_VERSION,
    });

    this.registerTools(server);

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);

    return { server, transport };
  }

  private registerTools(server: McpServer): void {
    // ─── Organizations ──────────────────────────────────────────────────
    server.registerTool(
      MCP_TOOL_CREATE_ORGANIZATION,
      {
        description: MCP_TOOL_CREATE_ORGANIZATION_DESCRIPTION,
        inputSchema: CreateOrganizationToolParams,
      },
      async (args) => this.toolHandler.handleCreateOrganization(args),
    );

    server.registerTool(
      MCP_TOOL_GET_ORGANIZATION,
      {
        description: MCP_TOOL_GET_ORGANIZATION_DESCRIPTION,
        inputSchema: GetOrganizationToolParams,
      },
      async (args) => this.toolHandler.handleGetOrganization(args),
    );

    server.registerTool(
      MCP_TOOL_LIST_ORGANIZATIONS,
      {
        description: MCP_TOOL_LIST_ORGANIZATIONS_DESCRIPTION,
        inputSchema: ListOrganizationsToolParams,
      },
      async () => this.toolHandler.handleListOrganizations(),
    );

    // ─── Projects ───────────────────────────────────────────────────────
    server.registerTool(
      MCP_TOOL_CREATE_PROJECT,
      {
        description: MCP_TOOL_CREATE_PROJECT_DESCRIPTION,
        inputSchema: CreateProjectToolParams,
      },
      async (args) => this.toolHandler.handleCreateProject(args),
    );

    server.registerTool(
      MCP_TOOL_GET_PROJECT,
      {
        description: MCP_TOOL_GET_PROJECT_DESCRIPTION,
        inputSchema: GetProjectToolParams,
      },
      async (args) => this.toolHandler.handleGetProject(args),
    );

    server.registerTool(
      MCP_TOOL_LIST_PROJECTS,
      {
        description: MCP_TOOL_LIST_PROJECTS_DESCRIPTION,
        inputSchema: ListProjectsToolParams,
      },
      async (args) => this.toolHandler.handleListProjects(args),
    );
  }
}
