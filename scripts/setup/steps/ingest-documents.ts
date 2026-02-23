import { askText, createSpinner, logStep } from '@/scripts/setup/prompts';
import { DEFAULT_DOCS_DIR } from '@/scripts/setup/constants';
import { loadMarkdownFiles } from '@/scripts/setup/markdown-loader';
import { callMcpTool } from '@/scripts/setup/mcp-client';
import { IngestResult, IngestSummary, SetupConfig } from '@/scripts/setup/types';

export async function ingestDocuments(
  mcpUrl: string,
  headers: Record<string, string>,
  config: SetupConfig,
): Promise<IngestSummary> {
  const defaultDir = config.docsDir ?? DEFAULT_DOCS_DIR;
  const docsDir = await askText('Docs directory', {
    defaultValue: defaultDir,
    placeholder: defaultDir,
  });

  const files = loadMarkdownFiles(docsDir);

  if (files.length === 0) {
    logStep('No markdown files found. Skipping document ingestion.');
    return { created: 0, updated: 0, unchanged: 0, failed: 0, docsDir };
  }

  const spinner = createSpinner();
  spinner.start(`Ingesting ${files.length} documents via MCP...`);

  const results: IngestResult[] = [];

  for (const file of files) {
    try {
      const result = await callMcpTool(mcpUrl, headers, 'knowstack.save_documents', {
        title: file.title,
        content: file.content,
        sourceType: 'MANUAL',
      });

      const action = (result.action as IngestResult['action']) ?? 'created';
      results.push({ path: file.relativePath, action });
    } catch (error) {
      results.push({
        path: file.relativePath,
        action: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const summary: IngestSummary = {
    created: results.filter((r) => r.action === 'created').length,
    updated: results.filter((r) => r.action === 'updated').length,
    unchanged: results.filter((r) => r.action === 'unchanged').length,
    failed: results.filter((r) => r.action === 'failed').length,
    docsDir,
  };

  spinner.stop(
    `Documents: ${summary.created} created, ${summary.updated} updated, ${summary.unchanged} unchanged` +
      (summary.failed > 0 ? `, ${summary.failed} failed` : ''),
  );

  return summary;
}
