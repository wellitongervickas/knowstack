import { Injectable } from '@nestjs/common';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { IMcpServerFactory, IMcpServerSession } from '@/core/interfaces/mcp/mcp-server.interface';
import { McpToolHandlerService } from '@/application/mcp/services/mcp-tool-handler.service';
import {
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  MCP_TOOL_QUERY,
  MCP_TOOL_QUERY_DESCRIPTION,
  MCP_TOOL_GET_DOCUMENTS,
  MCP_TOOL_GET_DOCUMENTS_DESCRIPTION,
  MCP_TOOL_SAVE_DOCUMENTS,
  MCP_TOOL_SAVE_DOCUMENTS_DESCRIPTION,
  MCP_TOOL_DELETE_DOCUMENTS,
  MCP_TOOL_DELETE_DOCUMENTS_DESCRIPTION,
  MCP_TOOL_GET_AGENTS,
  MCP_TOOL_GET_AGENTS_DESCRIPTION,
  MCP_TOOL_SAVE_AGENTS,
  MCP_TOOL_SAVE_AGENTS_DESCRIPTION,
  MCP_TOOL_DELETE_AGENTS,
  MCP_TOOL_DELETE_AGENTS_DESCRIPTION,
  MCP_TOOL_GET_COMMANDS,
  MCP_TOOL_GET_COMMANDS_DESCRIPTION,
  MCP_TOOL_SAVE_COMMANDS,
  MCP_TOOL_SAVE_COMMANDS_DESCRIPTION,
  MCP_TOOL_DELETE_COMMANDS,
  MCP_TOOL_DELETE_COMMANDS_DESCRIPTION,
  MCP_TOOL_GET_SKILLS,
  MCP_TOOL_GET_SKILLS_DESCRIPTION,
  MCP_TOOL_SAVE_SKILLS,
  MCP_TOOL_SAVE_SKILLS_DESCRIPTION,
  MCP_TOOL_DELETE_SKILLS,
  MCP_TOOL_DELETE_SKILLS_DESCRIPTION,
  MCP_TOOL_GET_TEMPLATES,
  MCP_TOOL_GET_TEMPLATES_DESCRIPTION,
  MCP_TOOL_SAVE_TEMPLATES,
  MCP_TOOL_SAVE_TEMPLATES_DESCRIPTION,
  MCP_TOOL_DELETE_TEMPLATES,
  MCP_TOOL_DELETE_TEMPLATES_DESCRIPTION,
  MCP_TOOL_GET_MEMORY,
  MCP_TOOL_GET_MEMORY_DESCRIPTION,
  MCP_TOOL_SAVE_MEMORY,
  MCP_TOOL_SAVE_MEMORY_DESCRIPTION,
  MCP_TOOL_UPDATE_MEMORY,
  MCP_TOOL_UPDATE_MEMORY_DESCRIPTION,
  MCP_TOOL_DELETE_MEMORY,
  MCP_TOOL_DELETE_MEMORY_DESCRIPTION,
  MCP_TOOL_SEARCH_INSTRUCTIONS,
  MCP_TOOL_SEARCH_INSTRUCTIONS_DESCRIPTION,
  MCP_TOOL_BACKFILL_INSTRUCTIONS,
  MCP_TOOL_BACKFILL_INSTRUCTIONS_DESCRIPTION,
  MCP_TOOL_BACKFILL_EMBEDDINGS,
  MCP_TOOL_BACKFILL_EMBEDDINGS_DESCRIPTION,
} from '@/application/mcp/mcp.constants';
import {
  QueryToolParams,
  GetDocumentsToolParams,
  SaveDocumentsToolParams,
  DeleteDocumentsToolParams,
  GetAgentsToolParams,
  SaveAgentsToolParams,
  DeleteAgentsToolParams,
  GetCommandsToolParams,
  SaveCommandsToolParams,
  DeleteCommandsToolParams,
  GetSkillsToolParams,
  SaveSkillsToolParams,
  DeleteSkillsToolParams,
  GetTemplatesToolParams,
  SaveTemplatesToolParams,
  DeleteTemplatesToolParams,
  GetMemoryToolParams,
  SaveMemoryToolParams,
  UpdateMemoryToolParams,
  DeleteMemoryToolParams,
  SearchInstructionsToolParams,
  BackfillInstructionsToolParams,
  BackfillEmbeddingsToolParams,
} from '@/application/mcp/dto/mcp-tool-schemas';

/**
 * MCP Server Factory implementation.
 *
 * Only file that imports from `@modelcontextprotocol/sdk`.
 * Creates per-request MCP server instances with Zod-validated tools,
 * delegating business logic to McpToolHandlerService.
 *
 * 23 tools using get/save/delete pattern.
 */
@Injectable()
export class McpServerFactoryImpl implements IMcpServerFactory {
  constructor(private readonly toolHandler: McpToolHandlerService) {}

  async create(): Promise<IMcpServerSession> {
    const server = new McpServer({
      name: MCP_SERVER_NAME,
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
    // ─── Query ──────────────────────────────────────────────────────────
    server.registerTool(
      MCP_TOOL_QUERY,
      { description: MCP_TOOL_QUERY_DESCRIPTION, inputSchema: QueryToolParams },
      async (args) => this.toolHandler.handleQuery(args),
    );

    // ─── Documents ──────────────────────────────────────────────────────
    server.registerTool(
      MCP_TOOL_GET_DOCUMENTS,
      { description: MCP_TOOL_GET_DOCUMENTS_DESCRIPTION, inputSchema: GetDocumentsToolParams },
      async (args) => this.toolHandler.handleGetDocuments(args),
    );

    server.registerTool(
      MCP_TOOL_SAVE_DOCUMENTS,
      { description: MCP_TOOL_SAVE_DOCUMENTS_DESCRIPTION, inputSchema: SaveDocumentsToolParams },
      async (args) => this.toolHandler.handleSaveDocuments(args),
    );

    server.registerTool(
      MCP_TOOL_DELETE_DOCUMENTS,
      {
        description: MCP_TOOL_DELETE_DOCUMENTS_DESCRIPTION,
        inputSchema: DeleteDocumentsToolParams,
      },
      async (args) => this.toolHandler.handleDeleteDocuments(args),
    );

    // ─── Agents ─────────────────────────────────────────────────────────
    server.registerTool(
      MCP_TOOL_GET_AGENTS,
      { description: MCP_TOOL_GET_AGENTS_DESCRIPTION, inputSchema: GetAgentsToolParams },
      async (args) => this.toolHandler.handleGetAgents(args),
    );

    server.registerTool(
      MCP_TOOL_SAVE_AGENTS,
      { description: MCP_TOOL_SAVE_AGENTS_DESCRIPTION, inputSchema: SaveAgentsToolParams },
      async (args) => this.toolHandler.handleSaveAgents(args),
    );

    server.registerTool(
      MCP_TOOL_DELETE_AGENTS,
      { description: MCP_TOOL_DELETE_AGENTS_DESCRIPTION, inputSchema: DeleteAgentsToolParams },
      async (args) => this.toolHandler.handleDeleteAgents(args),
    );

    // ─── Commands ───────────────────────────────────────────────────────
    server.registerTool(
      MCP_TOOL_GET_COMMANDS,
      { description: MCP_TOOL_GET_COMMANDS_DESCRIPTION, inputSchema: GetCommandsToolParams },
      async (args) => this.toolHandler.handleGetCommands(args),
    );

    server.registerTool(
      MCP_TOOL_SAVE_COMMANDS,
      { description: MCP_TOOL_SAVE_COMMANDS_DESCRIPTION, inputSchema: SaveCommandsToolParams },
      async (args) => this.toolHandler.handleSaveCommands(args),
    );

    server.registerTool(
      MCP_TOOL_DELETE_COMMANDS,
      { description: MCP_TOOL_DELETE_COMMANDS_DESCRIPTION, inputSchema: DeleteCommandsToolParams },
      async (args) => this.toolHandler.handleDeleteCommands(args),
    );

    // ─── Skills ─────────────────────────────────────────────────────────
    server.registerTool(
      MCP_TOOL_GET_SKILLS,
      { description: MCP_TOOL_GET_SKILLS_DESCRIPTION, inputSchema: GetSkillsToolParams },
      async (args) => this.toolHandler.handleGetSkills(args),
    );

    server.registerTool(
      MCP_TOOL_SAVE_SKILLS,
      { description: MCP_TOOL_SAVE_SKILLS_DESCRIPTION, inputSchema: SaveSkillsToolParams },
      async (args) => this.toolHandler.handleSaveSkills(args),
    );

    server.registerTool(
      MCP_TOOL_DELETE_SKILLS,
      { description: MCP_TOOL_DELETE_SKILLS_DESCRIPTION, inputSchema: DeleteSkillsToolParams },
      async (args) => this.toolHandler.handleDeleteSkills(args),
    );

    // ─── Templates ──────────────────────────────────────────────────────
    server.registerTool(
      MCP_TOOL_GET_TEMPLATES,
      { description: MCP_TOOL_GET_TEMPLATES_DESCRIPTION, inputSchema: GetTemplatesToolParams },
      async (args) => this.toolHandler.handleGetTemplates(args),
    );

    server.registerTool(
      MCP_TOOL_SAVE_TEMPLATES,
      { description: MCP_TOOL_SAVE_TEMPLATES_DESCRIPTION, inputSchema: SaveTemplatesToolParams },
      async (args) => this.toolHandler.handleSaveTemplates(args),
    );

    server.registerTool(
      MCP_TOOL_DELETE_TEMPLATES,
      {
        description: MCP_TOOL_DELETE_TEMPLATES_DESCRIPTION,
        inputSchema: DeleteTemplatesToolParams,
      },
      async (args) => this.toolHandler.handleDeleteTemplates(args),
    );

    // ─── Memory ─────────────────────────────────────────────────────────
    server.registerTool(
      MCP_TOOL_GET_MEMORY,
      { description: MCP_TOOL_GET_MEMORY_DESCRIPTION, inputSchema: GetMemoryToolParams },
      async (args) => this.toolHandler.handleGetMemory(args),
    );

    server.registerTool(
      MCP_TOOL_SAVE_MEMORY,
      { description: MCP_TOOL_SAVE_MEMORY_DESCRIPTION, inputSchema: SaveMemoryToolParams },
      async (args) => this.toolHandler.handleSaveMemory(args),
    );

    server.registerTool(
      MCP_TOOL_UPDATE_MEMORY,
      { description: MCP_TOOL_UPDATE_MEMORY_DESCRIPTION, inputSchema: UpdateMemoryToolParams },
      async (args) => this.toolHandler.handleUpdateMemory(args),
    );

    server.registerTool(
      MCP_TOOL_DELETE_MEMORY,
      { description: MCP_TOOL_DELETE_MEMORY_DESCRIPTION, inputSchema: DeleteMemoryToolParams },
      async (args) => this.toolHandler.handleDeleteMemory(args),
    );

    // ─── Search ─────────────────────────────────────────────────────────
    server.registerTool(
      MCP_TOOL_SEARCH_INSTRUCTIONS,
      {
        description: MCP_TOOL_SEARCH_INSTRUCTIONS_DESCRIPTION,
        inputSchema: SearchInstructionsToolParams,
      },
      async (args) => this.toolHandler.handleSearchInstructions(args),
    );

    // ─── Backfill ────────────────────────────────────────────────────────
    server.registerTool(
      MCP_TOOL_BACKFILL_INSTRUCTIONS,
      {
        description: MCP_TOOL_BACKFILL_INSTRUCTIONS_DESCRIPTION,
        inputSchema: BackfillInstructionsToolParams,
      },
      async (args) => this.toolHandler.handleBackfillInstructions(args),
    );

    server.registerTool(
      MCP_TOOL_BACKFILL_EMBEDDINGS,
      {
        description: MCP_TOOL_BACKFILL_EMBEDDINGS_DESCRIPTION,
        inputSchema: BackfillEmbeddingsToolParams,
      },
      async (args) => this.toolHandler.handleBackfillEmbeddings(args),
    );
  }
}
