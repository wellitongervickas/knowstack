import { createSpinner } from '../prompts';
import { callMcpTool } from '../mcp-client';
import type { EmbedResult } from '../types';

/**
 * Backfill embeddings for all ingested documents via MCP.
 * Non-blocking: warns on failure but does not throw.
 */
export async function embedDocuments(
  mcpUrl: string,
  headers: Record<string, string>,
): Promise<EmbedResult | null> {
  const spinner = createSpinner();
  spinner.start('Generating document embeddings...');

  try {
    const result = (await callMcpTool(mcpUrl, headers, 'knowstack.backfill_embeddings', {
      force: false,
    })) as unknown as EmbedResult;

    const parts: string[] = [];
    if (result.embedded > 0) parts.push(`${result.embedded} embedded`);
    const alreadyEmbedded = result.found - result.total;
    if (alreadyEmbedded > 0) parts.push(`${alreadyEmbedded} already embedded`);
    if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
    if (result.failed > 0) parts.push(`${result.failed} failed`);

    spinner.stop(
      `Doc embeddings: ${parts.join(', ')} (${result.found} total, ${result.durationMs}ms)`,
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.stop(`Doc embeddings: skipped (${message})`);
    return null;
  }
}
