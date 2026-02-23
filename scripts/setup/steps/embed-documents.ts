import { createSpinner } from '@/scripts/setup/prompts';
import { callMcpTool } from '@/scripts/setup/mcp-client';
import type { EmbedResult } from '@/scripts/setup/types';

/**
 * Backfill embeddings for all ingested documents via MCP.
 * Runs after ingest-documents to ensure all documents have vector embeddings.
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
    if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
    if (result.failed > 0) parts.push(`${result.failed} failed`);

    spinner.stop(
      `Doc embeddings: ${parts.join(', ')} (${result.total} total, ${result.durationMs}ms)`,
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.stop(`Doc embeddings: skipped (${message})`);
    return null;
  }
}
