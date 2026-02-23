import { logSuccess, logStep } from '@/scripts/setup/prompts';
import { SetupResult } from '@/scripts/setup/types';

export function printSummary(result: SetupResult): void {
  const { orgSlug, projectSlug, mcpUrl, contextProjects, embeddings } = result;

  const lines = [
    `Organization: ${result.orgName} (${orgSlug})`,
    `Project: ${result.projectName} (${projectSlug})`,
    `Documents: ${result.documents.created} created, ${result.documents.updated} updated, ${result.documents.unchanged} unchanged` +
      (result.documents.failed > 0 ? `, ${result.documents.failed} failed` : ''),
    `Instructions: ${result.instructions.agents} agents, ${result.instructions.skills} skills, ${result.instructions.commands} commands, ${result.instructions.templates} templates`,
  ];

  if (embeddings) {
    if (embeddings.documents) {
      const d = embeddings.documents;
      lines.push(
        `Doc embeddings: ${d.embedded} embedded, ${d.skipped} skipped` +
          (d.failed > 0 ? `, ${d.failed} failed` : ''),
      );
    }
    if (embeddings.instructions) {
      const i = embeddings.instructions;
      lines.push(
        `Instruction embeddings: ${i.embedded} embedded, ${i.skipped} skipped` +
          (i.failed > 0 ? `, ${i.failed} failed` : ''),
      );
    }
  }

  logSuccess(lines.join('\n'));

  const hasContext = contextProjects && contextProjects.length > 0;
  const contextJson = hasContext ? JSON.stringify(contextProjects) : undefined;

  const headersObj: Record<string, string> = {
    'x-ks-org': orgSlug,
    'x-ks-project': projectSlug,
  };

  if (contextJson) {
    headersObj['x-ks-context'] = contextJson;
  }

  const mcpServer = {
    type: 'http',
    url: mcpUrl,
    headers: headersObj,
  };

  // Claude Code — CLI command
  const headerFlags = Object.entries(headersObj)
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' ');
  const cliCommand = `claude mcp add knowstack --transport http ${mcpUrl} ${headerFlags}`;

  logStep('Claude Code — run this command:');
  console.log(cliCommand);
  console.log();

  // Claude Code — JSON config
  const claudeConfig = { mcpServers: { knowstack: mcpServer } };

  logStep('Claude Code — or add to .claude.json:');
  console.log(JSON.stringify(claudeConfig, null, 2));
  console.log();

  // VS Code / Cursor (.vscode/mcp.json)
  const vscodeConfig = { servers: { knowstack: mcpServer } };

  logStep('VS Code / Cursor — add to .vscode/mcp.json:');
  console.log(JSON.stringify(vscodeConfig, null, 2));
  console.log();
}
