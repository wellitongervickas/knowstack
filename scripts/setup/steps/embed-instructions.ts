import { createSpinner } from '@/scripts/setup/prompts';
import { callMcpTool } from '@/scripts/setup/mcp-client';
import type { EmbedResult } from '@/scripts/setup/types';

/**
 * Backfill embeddings for all seeded instructions via MCP.
 * Runs after seed-instructions to ensure all instructions have vector embeddings.
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
    if (result.skipped > 0) parts.push(`${result.skipped} skipped`);
    if (result.failed > 0) parts.push(`${result.failed} failed`);

    spinner.stop(
      `Instruction embeddings: ${parts.join(', ')} (${result.total} total, ${result.durationMs}ms)`,
    );
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    spinner.stop(`Instruction embeddings: skipped (${message})`);
    return null;
  }
}
