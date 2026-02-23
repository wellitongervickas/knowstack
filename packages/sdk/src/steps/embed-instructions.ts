import { createSpinner } from '../prompts';
import { callMcpTool } from '../mcp-client';
import type { EmbedResult } from '../types';

/**
 * Backfill embeddings for all seeded instructions via MCP.
 * Non-blocking: warns on failure but does not throw.
 */
export async function embedInstructions(
  mcpUrl: string,
  headers: Record<string, string>,
): Promise<EmbedResult | null> {
  const spinner = createSpinner();
  spinner.start('Generating instruction embeddings...');

  try {
    const result = (await callMcpTool(mcpUrl, headers, 'knowstack.backfill_instructions', {
      force: false,
    })) as unknown as EmbedResult;

    const parts: string[] = [];
    if (result.embedded > 0) parts.push(`${result.embedded} embedded`);
    const alreadyEmbedded = result.found - result.total;
    if (alreadyEmbedded > 0) parts.push(`${alreadyEmbedded} already embedded`);
    if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
    if (result.failed > 0) parts.push(`${result.failed} failed`);

    spinner.stop(
      `Instruction embeddings: ${parts.join(', ')} (${result.found} total, ${result.durationMs}ms)`,
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.stop(`Instruction embeddings: skipped (${message})`);
    return null;
  }
}
