/**
 * MCP Server interfaces.
 * Abstracts the MCP SDK so that only the infrastructure layer depends on it.
 */

/**
 * Handle for an MCP HTTP transport.
 * Accepts incoming HTTP requests and writes MCP responses.
 */
export interface IMcpTransportHandle {
  handleRequest(req: unknown, res: unknown, body: unknown): Promise<void>;
  close(): Promise<void>;
}

/**
 * Handle for an MCP server instance.
 */
export interface IMcpServerHandle {
  close(): Promise<void>;
}

/**
 * A connected MCP server + transport pair, created per-request.
 */
export interface IMcpServerSession {
  server: IMcpServerHandle;
  transport: IMcpTransportHandle;
}

/**
 * Factory for creating per-request MCP server sessions.
 */
export interface IMcpServerFactory {
  create(): Promise<IMcpServerSession>;
}

export const MCP_SERVER_FACTORY = Symbol('MCP_SERVER_FACTORY');
export const MCP_ADMIN_SERVER_FACTORY = Symbol('MCP_ADMIN_SERVER_FACTORY');

/**
 * MCP tool result shape returned to the SDK.
 * Index signature required by CallToolResult.
 */
export interface McpToolResult {
  [key: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}
