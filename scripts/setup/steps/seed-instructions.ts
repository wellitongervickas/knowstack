import { createSpinner } from '@/scripts/setup/prompts';
import {
  DEFAULT_AGENTS_DIR,
  DEFAULT_SKILLS_DIR,
  DEFAULT_COMMANDS_DIR,
  DEFAULT_TEMPLATES_DIR,
} from '@/scripts/setup/constants';
import { loadMarkdownFiles } from '@/scripts/setup/markdown-loader';
import { callMcpTool } from '@/scripts/setup/mcp-client';
import { InstructionSeedResult } from '@/scripts/setup/types';

interface InstructionDir {
  dir: string;
  toolName: string;
  label: keyof InstructionSeedResult;
}

export async function seedInstructions(
  mcpUrl: string,
  headers: Record<string, string>,
): Promise<InstructionSeedResult> {
  const dirs: InstructionDir[] = [
    { dir: DEFAULT_AGENTS_DIR, toolName: 'knowstack.save_agents', label: 'agents' },
    { dir: DEFAULT_SKILLS_DIR, toolName: 'knowstack.save_skills', label: 'skills' },
    { dir: DEFAULT_COMMANDS_DIR, toolName: 'knowstack.save_commands', label: 'commands' },
    { dir: DEFAULT_TEMPLATES_DIR, toolName: 'knowstack.save_templates', label: 'templates' },
  ];

  const result: InstructionSeedResult = { agents: 0, skills: 0, commands: 0, templates: 0 };
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let failed = 0;

  const spinner = createSpinner();
  spinner.start('Seeding instructions via MCP...');

  for (const { dir, toolName, label } of dirs) {
    const files = loadMarkdownFiles(dir);
    const instructionFiles = files.filter((f) => !f.relativePath.endsWith('index'));
    let count = 0;

    for (const file of instructionFiles) {
      try {
        const name = extractFrontmatterField(file.content, 'name') || file.title;
        const description = extractDescription(file.content);

        const response = await callMcpTool(mcpUrl, headers, toolName, {
          name,
          description,
          content: file.content,
          visibility: 'PUBLIC',
        });

        const status = response.status as string | undefined;
        if (status === 'created') created++;
        else if (status === 'unchanged') unchanged++;
        else updated++;

        count++;
      } catch {
        failed++;
      }
    }

    result[label] = count;
  }

  const total = result.agents + result.skills + result.commands + result.templates;
  spinner.stop(
    `Instructions: ${created} created, ${updated} updated, ${unchanged} unchanged` +
      (failed > 0 ? `, ${failed} failed` : '') +
      ` (${total} total)`,
  );

  return result;
}

function extractDescription(content: string): string {
  const frontmatterDesc = extractFrontmatterDescription(content);
  if (frontmatterDesc) {
    return frontmatterDesc.length > 500 ? frontmatterDesc.slice(0, 497) + '...' : frontmatterDesc;
  }

  const body = stripFrontmatter(content);
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('[')) continue;
    return trimmed.length > 500 ? trimmed.slice(0, 497) + '...' : trimmed;
  }
  return 'No description';
}

function extractFrontmatterField(content: string, field: string): string | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;

  const frontmatter = match[1];
  const fieldMatch = frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return fieldMatch ? fieldMatch[1].trim() : null;
}

function extractFrontmatterDescription(content: string): string | null {
  return extractFrontmatterField(content, 'description');
}

function stripFrontmatter(content: string): string {
  return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n?/, '');
}
