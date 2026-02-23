import {
  intro,
  outro,
  logWarning,
  logStep,
  askText,
  askConfirm,
  askMultiSelect,
} from './prompts';
import { DEFAULT_MCP_URL, CONFIG_FILE_NAME } from './constants';
import { loadProfiles, selectProfile, saveProfiles } from './config';
import { checkMcpHealth } from './mcp-client';
import { createOrganization } from './steps/create-organization';
import { createProject } from './steps/create-project';
import { ingestDocuments } from './steps/ingest-documents';
import { seedInstructions } from './steps/seed-instructions';
import { embedDocuments } from './steps/embed-documents';
import { embedInstructions } from './steps/embed-instructions';
import { printSummary } from './steps/print-summary';
import { ContextProjectConfig, SetupResult } from './types';
import { callMcpTool } from './mcp-client';

export async function main(opts: { profile?: string }): Promise<void> {
  intro('KnowStack Setup');

  // 1. Load profiles and select one
  const profiles = loadProfiles();
  const { name: profileName, config } = await selectProfile(profiles, opts.profile);

  logStep(`Profile: ${profileName}`);

  // 2. Prompt for MCP URL (use saved or prompt)
  const defaultUrl = config.mcpUrl ?? DEFAULT_MCP_URL;
  const mcpUrl = await askText('MCP server URL', {
    defaultValue: defaultUrl,
    placeholder: defaultUrl,
  });

  // 3. Check MCP server health early
  const serverUp = await checkMcpHealth(mcpUrl);
  if (!serverUp) {
    logWarning('MCP server not reachable at ' + mcpUrl);
    logWarning('Start your KnowStack server first, then re-run: npx @knowstack/sdk --init');
    return;
  }

  // 4. Create/select organization via admin MCP
  const org = await createOrganization(mcpUrl, config);

  // 5. Create/select project via admin MCP
  const project = await createProject(mcpUrl, org.slug, config);

  // 6. Fetch other projects in the org for context projects prompt
  let orgProjects: { slug: string; name: string }[] = [];
  try {
    const adminUrl = mcpUrl.replace(/\/?$/, '/admin');
    const allProjects = (await callMcpTool(adminUrl, {}, 'knowstack.list_projects', {
      organizationSlug: org.slug,
    })) as unknown as { slug: string; name: string }[];
    orgProjects = Array.isArray(allProjects)
      ? allProjects.filter((p) => p.slug !== project.slug)
      : [];
  } catch {
    // Non-critical — skip context projects
  }

  // 7. Prompt for context projects (if not already configured)
  let contextProjects = config.contextProjects;

  if (!contextProjects && orgProjects.length > 0) {
    const addContext = await askConfirm('Add context projects? (share data from other projects)');

    if (addContext) {
      contextProjects = await promptContextProjects(orgProjects);
    }
  }

  // 8. Save profile immediately
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

  // 9. Build tenant headers for content operations
  const headers = buildHeaders(org.slug, project.slug, contextProjects);

  // 10. Content operations via MCP
  const documents = await ingestDocuments(mcpUrl, headers, updatedConfig);
  const instructions = await seedInstructions(mcpUrl, headers);

  // 11. Generate embeddings (non-blocking)
  const docEmbeddings = await embedDocuments(mcpUrl, headers);
  const instrEmbeddings = await embedInstructions(mcpUrl, headers);

  // 12. Save final config (docsDir may have changed during prompt)
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
