import { logSuccess, logStep } from '../prompts';
import { SetupResult } from '../types';

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
      const dAlready = d.found - d.total;
      const dParts = [`${d.embedded} embedded`];
      if (dAlready > 0) dParts.push(`${dAlready} already embedded`);
      if (d.skipped > 0) dParts.push(`${d.skipped} skipped`);
      if (d.failed > 0) dParts.push(`${d.failed} failed`);
      lines.push(`Doc embeddings: ${dParts.join(', ')} (${d.found} total)`);
    }
    if (embeddings.instructions) {
      const i = embeddings.instructions;
      const iAlready = i.found - i.total;
      const iParts = [`${i.embedded} embedded`];
      if (iAlready > 0) iParts.push(`${iAlready} already embedded`);
      if (i.skipped > 0) iParts.push(`${i.skipped} skipped`);
      if (i.failed > 0) iParts.push(`${i.failed} failed`);
      lines.push(`Instruction embeddings: ${iParts.join(', ')} (${i.found} total)`);
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
