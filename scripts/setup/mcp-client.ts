/**
 * Lightweight MCP client for the setup script.
 *
 * The KnowStack MCP server uses stateless StreamableHTTPServerTransport
 * (sessionIdGenerator: undefined). Each HTTP request creates a fresh transport.
 *
 * MCP SDK v1.26+ enforces: if a batch contains `initialize`, it must be the
 * only message. In stateless mode, non-init requests skip session validation,
 * so we can send `tools/call` as a standalone request without prior init.
 */

const TOOL_CALL_ID = 1;

const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};

export interface McpToolResult {
  [key: string]: unknown;
}

export async function callMcpTool(
  mcpUrl: string,
  headers: Record<string, string>,
  toolName: string,
  args: Record<string, unknown>,
): Promise<McpToolResult> {
  const message = {
    jsonrpc: '2.0',
    id: TOOL_CALL_ID,
    method: 'tools/call',
    params: { name: toolName, arguments: args },
  };

  const response = await fetch(mcpUrl, {
    method: 'POST',
    headers: { ...COMMON_HEADERS, ...headers },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    const hint =
      response.status === 401
        ? ' — check API key or auth configuration'
        : response.status === 400
          ? ' — check x-ks-org / x-ks-project headers'
          : '';
    throw new Error(`MCP server returned ${response.status}: ${response.statusText}${hint}`);
  }

  const contentType = response.headers.get('content-type') ?? '';
  const body = await response.text();
  const toolResponse = contentType.includes('text/event-stream')
    ? parseSseResponse(body, TOOL_CALL_ID)
    : parseJsonResponse(body, TOOL_CALL_ID);

  if (!toolResponse) {
    throw new Error('No tool response received from MCP server');
  }

  if (toolResponse.error) {
    const err = toolResponse.error as { message?: string; code?: number };
    throw new Error(`MCP error ${err.code ?? 'unknown'}: ${err.message ?? 'Unknown error'}`);
  }

  const result = toolResponse.result as { content?: Array<{ text?: string }>; isError?: boolean };

  if (result.isError) {
    const message = result.content?.[0]?.text ?? 'Unknown tool error';
    throw new Error(`MCP tool error: ${message}`);
  }

  const text = result.content?.[0]?.text;
  if (!text) {
    throw new Error('Empty response from MCP tool');
  }

  return JSON.parse(text) as McpToolResult;
}

/**
 * Quick health check: POST to the MCP URL and check if the server responds.
 * Any HTTP response (even 400) means the server is reachable.
 */
export async function checkMcpHealth(mcpUrl: string): Promise<boolean> {
  try {
    await fetch(mcpUrl, {
      method: 'POST',
      headers: COMMON_HEADERS,
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'ping' }),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse SSE response body (text/event-stream) for the JSON-RPC response matching the given id.
 */
function parseSseResponse(
  body: string,
  targetId: number,
): { result?: unknown; error?: unknown } | null {
  const events = body.split('\n\n');

  for (const event of events) {
    const lines = event.split('\n');

    for (const line of lines) {
      if (!line.startsWith('data:')) continue;

      const jsonStr = line.slice('data:'.length).trim();
      if (!jsonStr) continue;

      try {
        const parsed = JSON.parse(jsonStr) as
          | { id?: number; result?: unknown; error?: unknown }
          | Array<{ id?: number; result?: unknown; error?: unknown }>;

        const responses = Array.isArray(parsed) ? parsed : [parsed];

        for (const resp of responses) {
          if (resp.id === targetId) {
            return resp;
          }
        }
      } catch {
        // Skip unparseable lines
      }
    }
  }

  return null;
}

/**
 * Parse a JSON response body (application/json) for the JSON-RPC response matching the given id.
 */
function parseJsonResponse(
  body: string,
  targetId: number,
): { result?: unknown; error?: unknown } | null {
  try {
    const parsed = JSON.parse(body) as
      | { id?: number; result?: unknown; error?: unknown }
      | Array<{ id?: number; result?: unknown; error?: unknown }>;

    const responses = Array.isArray(parsed) ? parsed : [parsed];
    for (const resp of responses) {
      if (resp.id === targetId) {
        return resp;
      }
    }
  } catch {
    // Unparseable
  }
  return null;
}
