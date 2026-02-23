import { PrismaClient } from '@prisma/client';
import {
  intro,
  outro,
  logError,
  logWarning,
  logStep,
  askConfirm,
  askMultiSelect,
} from '@/scripts/setup/prompts';
import { DEFAULT_MCP_URL, CONFIG_FILE_NAME } from '@/scripts/setup/constants';
import { loadProfiles, selectProfile, saveProfiles, parseProfileArg } from '@/scripts/setup/config';
import { checkMcpHealth } from '@/scripts/setup/mcp-client';
import { createOrganization } from '@/scripts/setup/steps/create-organization';
import { createProject } from '@/scripts/setup/steps/create-project';
import { ingestDocuments } from '@/scripts/setup/steps/ingest-documents';
import { seedInstructions } from '@/scripts/setup/steps/seed-instructions';
import { embedDocuments } from '@/scripts/setup/steps/embed-documents';
import { embedInstructions } from '@/scripts/setup/steps/embed-instructions';
import { printSummary } from '@/scripts/setup/steps/print-summary';
import { SetupResult } from '@/scripts/setup/types';
import type { ContextProjectConfig } from '@/core/interfaces/config/knowstack-config.interface';

async function main(): Promise<void> {
  intro('KnowStack Setup');

  // 1. Load profiles and select one
  const profiles = loadProfiles();
  const profileArg = parseProfileArg();
  const { name: profileName, config } = await selectProfile(profiles, profileArg);

  logStep(`Profile: ${profileName}`);

  // 2. Use saved MCP URL or default to localhost
  const mcpUrl = config.mcpUrl ?? DEFAULT_MCP_URL;

  // 3. Bootstrap org/project via PrismaClient
  const prisma = new PrismaClient();

  let org: { id: string; name: string; slug: string };
  let project: { id: string; name: string; slug: string };
  let orgProjects: { slug: string; name: string }[] = [];

  try {
    await prisma.$connect();
    org = await createOrganization(prisma, config);
    project = await createProject(prisma, org.id, config);

    // Fetch other projects in the org for context projects prompt
    const allProjects = await prisma.project.findMany({
      where: { organizationId: org.id },
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    });
    orgProjects = allProjects.filter((p) => p.slug !== project.slug);
  } finally {
    await prisma.$disconnect();
  }

  // 4. Prompt for context projects (if not already configured)
  let contextProjects = config.contextProjects;

  if (!contextProjects && orgProjects.length > 0) {
    const addContext = await askConfirm('Add context projects? (share data from other projects)');

    if (addContext) {
      contextProjects = await promptContextProjects(orgProjects);
    }
  }

  // 5. Save profile immediately (org/project now exist in DB)
  const updatedConfig = {
    mcpUrl,
    orgSlug: org.slug,
    projectSlug: project.slug,
    docsDir: config.docsDir,
    contextProjects,
  };
  profiles[profileName] = updatedConfig;
  saveProfiles(profiles);
  logStep(`Config saved to ${CONFIG_FILE_NAME}`);

  // 6. Check MCP server health
  const headers = buildHeaders(org.slug, project.slug, contextProjects);

  const serverUp = await checkMcpHealth(mcpUrl);
  if (!serverUp) {
    logWarning('MCP server not reachable. Start with: pnpm start:dev');
    logWarning('Then re-run: pnpm setup:seed (config saved, press Enter through prompts)');
    return;
  }

  // 7. Content operations via MCP
  const documents = await ingestDocuments(mcpUrl, headers, updatedConfig);
  const instructions = await seedInstructions(mcpUrl, headers);

  // 8. Generate embeddings (non-blocking)
  const docEmbeddings = await embedDocuments(mcpUrl, headers);
  const instrEmbeddings = await embedInstructions(mcpUrl, headers);

  // 9. Save final config (docsDir may have changed during prompt)
  profiles[profileName] = { ...updatedConfig, docsDir: documents.docsDir };
  saveProfiles(profiles);

  const result: SetupResult = {
    orgName: org.name,
    orgSlug: org.slug,
    projectName: project.name,
    projectSlug: project.slug,
    mcpUrl,
    documents,
    instructions,
    embeddings: {
      documents: docEmbeddings,
      instructions: instrEmbeddings,
    },
    contextProjects,
  };

  printSummary(result);
  outro('Setup complete!');
}

async function promptContextProjects(
  available: { slug: string; name: string }[],
): Promise<ContextProjectConfig[]> {
  const selectedSlugs = await askMultiSelect(
    'Select projects to share data from',
    available.map((p) => ({ value: p.slug, label: `${p.name} (${p.slug})` })),
  );

  if (selectedSlugs.length === 0) return [];

  const contextProjects: ContextProjectConfig[] = [];

  for (const slug of selectedSlugs) {
    const types = await askMultiSelect(`Data types to share from "${slug}"`, [
      { value: 'agents', label: 'Agents' },
      { value: 'commands', label: 'Commands' },
      { value: 'skills', label: 'Skills' },
      { value: 'documents', label: 'Documents' },
      { value: 'memory', label: 'Memory' },
    ]);

    if (types.length === 0) continue;

    const hasPriority = await askConfirm(`Should "${slug}" data override the parent project?`);

    const priority = hasPriority ? { priorityOverParent: true } : { priorityOverParent: false };
    const entry: ContextProjectConfig = {
      name: slug,
      agents: types.includes('agents') ? priority : undefined,
      commands: types.includes('commands') ? priority : undefined,
      skills: types.includes('skills') ? priority : undefined,
      documents: types.includes('documents') ? priority : undefined,
      memory: types.includes('memory') ? priority : undefined,
    };

    contextProjects.push(entry);
  }

  return contextProjects;
}

function buildHeaders(
  orgSlug: string,
  projectSlug: string,
  contextProjects?: ContextProjectConfig[],
): Record<string, string> {
  const headers: Record<string, string> = {
    'x-ks-org': orgSlug,
    'x-ks-project': projectSlug,
  };

  if (contextProjects && contextProjects.length > 0) {
    headers['x-ks-context'] = JSON.stringify(contextProjects);
  }

  return headers;
}

main().catch((error) => {
  logError(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
