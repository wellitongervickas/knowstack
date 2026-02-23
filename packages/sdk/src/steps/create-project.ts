import { askText, askSelect, logStep } from '../prompts';
import { slugify } from '../utils';
import { callMcpTool } from '../mcp-client';
import { SetupConfig } from '../types';

interface ProjectResult {
  id: string;
  name: string;
  slug: string;
}

/**
 * Derive the admin MCP URL from the base MCP URL.
 */
function getAdminUrl(mcpUrl: string): string {
  return mcpUrl.replace(/\/?$/, '/admin');
}

export async function createProject(
  mcpUrl: string,
  orgSlug: string,
  config: SetupConfig,
): Promise<ProjectResult> {
  const adminUrl = getAdminUrl(mcpUrl);

  // Fetch existing projects via admin MCP
  const existingResponse = await callMcpTool(adminUrl, {}, 'knowstack.list_projects', {
    organizationSlug: orgSlug,
  });
  const existing = existingResponse as unknown as ProjectResult[];

  if (Array.isArray(existing) && existing.length > 0) {
    // If config has a slug, try to auto-select the matching project
    if (config.projectSlug) {
      const match = existing.find((p) => p.slug === config.projectSlug);
      if (match) {
        logStep(`Using project: ${match.name} (${match.slug})`);
        return { id: match.id, name: match.name, slug: match.slug };
      }
    }

    const choice = await askSelect('Project', [
      { value: '_new', label: 'Create new project' },
      ...existing.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.slug})`,
      })),
    ]);

    if (choice !== '_new') {
      const project = existing.find((p) => p.id === choice)!;
      logStep(`Using project: ${project.name}`);
      return { id: project.id, name: project.name, slug: project.slug };
    }
  }

  const name = await askText('Project name', {
    placeholder: 'My Project',
  });

  const suggestedSlug = config.projectSlug ?? slugify(name);
  const slug = await askText('Project slug', {
    defaultValue: suggestedSlug,
    placeholder: suggestedSlug,
    validate: (v) => {
      if (!v || v.trim().length === 0) return 'Slug is required';
      if (!/^[a-z0-9-]+$/.test(v)) return 'Slug must be lowercase alphanumeric with hyphens';
      return undefined;
    },
  });

  // Try to get existing project by slug first (upsert-like behavior)
  try {
    const existingProject = (await callMcpTool(adminUrl, {}, 'knowstack.get_project', {
      organizationSlug: orgSlug,
      slug,
    })) as unknown as ProjectResult;
    logStep(`Project ready: ${existingProject.name} (${existingProject.slug})`);
    return { id: existingProject.id, name: existingProject.name, slug: existingProject.slug };
  } catch {
    // Not found — create new
  }

  const project = (await callMcpTool(adminUrl, {}, 'knowstack.create_project', {
    organizationSlug: orgSlug,
    name,
    slug,
  })) as unknown as ProjectResult;

  logStep(`Project ready: ${project.name} (${project.slug})`);
  return { id: project.id, name: project.name, slug: project.slug };
}
