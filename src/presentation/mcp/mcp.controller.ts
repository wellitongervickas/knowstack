import { Controller, Post, Get, Delete, Req, Res, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { IMcpServerFactory, MCP_SERVER_FACTORY } from '@/core/interfaces/mcp/mcp-server.interface';
import {
  IStructuredLogger,
  STRUCTURED_LOGGER,
} from '@/core/interfaces/services/observability.interface';
import {
  SECURITY_HEADERS,
  SECURITY_HEADER_VALUES,
} from '@/application/security/security.constants';

/**
 * MCP (Model Context Protocol) Controller — the sole presentation layer.
 *
 * Provides POST and GET endpoints for MCP protocol requests.
 * Tenant context is resolved by ConfigTenantMiddleware from HTTP headers.
 *
 * No authentication — local-first mode.
 */
@Controller('mcp')
export class McpController {
  constructor(
    @Inject(MCP_SERVER_FACTORY)
    private readonly mcpServerFactory: IMcpServerFactory,
    @Inject(STRUCTURED_LOGGER)
    private readonly logger: IStructuredLogger,
  ) {}

  /**
   * POST /mcp
   * Handle MCP protocol requests via HTTP SSE transport.
   */
  @Post()
  async handleMcpPost(@Req() req: Request, @Res({ passthrough: false }) res: Response) {
    await this.handleMcpRequest(req, res);
  }

  /**
   * GET /mcp
   * Route through SDK transport (supports tools/list and other read operations).
   */
  @Get()
  async handleMcpGet(@Req() req: Request, @Res({ passthrough: false }) res: Response) {
    await this.handleMcpRequest(req, res);
  }

  /**
   * DELETE /mcp
   * Stateless server — no sessions to terminate.
   */
  @Delete()
  handleDeleteRequest(@Res({ passthrough: false }) res: Response) {
    res.status(405).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Method not allowed. Stateless server has no sessions to terminate.',
      },
      id: null,
    });
  }

  private async handleMcpRequest(req: Request, res: Response): Promise<void> {
    const startTime = Date.now();

    // Set security headers manually (streaming response bypasses interceptor)
    res.setHeader(
      SECURITY_HEADERS.CONTENT_TYPE_OPTIONS,
      SECURITY_HEADER_VALUES.CONTENT_TYPE_OPTIONS,
    );
    res.setHeader(SECURITY_HEADERS.FRAME_OPTIONS, SECURITY_HEADER_VALUES.FRAME_OPTIONS);
    res.setHeader(SECURITY_HEADERS.STRICT_TRANSPORT_SECURITY, SECURITY_HEADER_VALUES.HSTS);

    this.logger.info('MCP request started', {
      method: req.method,
      path: req.path,
    });

    let session: Awaited<ReturnType<IMcpServerFactory['create']>> | undefined;
    try {
      session = await this.mcpServerFactory.create();
      await session.transport.handleRequest(req, res, req.body);
    } catch (error) {
      this.logger.error('MCP request failed', error instanceof Error ? error : undefined, {
        method: req.method,
        path: req.path,
      } as Record<string, unknown>);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    } finally {
      if (session) {
        await session.transport.close().catch(() => {});
        await session.server.close().catch(() => {});
      }

      const latencyMs = Date.now() - startTime;
      this.logger.info('MCP request completed', {
        method: req.method,
        path: req.path,
        latencyMs,
      });
    }
  }
}
