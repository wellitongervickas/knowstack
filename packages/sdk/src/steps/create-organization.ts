import { askText, askSelect, logStep } from '../prompts';
import { slugify } from '../utils';
import { callMcpTool } from '../mcp-client';
import { SetupConfig } from '../types';

interface OrgResult {
  id: string;
  name: string;
  slug: string;
}

/**
 * Derive the admin MCP URL from the base MCP URL.
 * e.g., http://localhost:3000/api/v1/mcp → http://localhost:3000/api/v1/mcp/admin
 */
function getAdminUrl(mcpUrl: string): string {
  return mcpUrl.replace(/\/?$/, '/admin');
}

export async function createOrganization(
  mcpUrl: string,
  config: SetupConfig,
): Promise<OrgResult> {
  const adminUrl = getAdminUrl(mcpUrl);

  // Fetch existing organizations via admin MCP
  const existingResponse = await callMcpTool(adminUrl, {}, 'knowstack.list_organizations', {});
  const existing = existingResponse as unknown as OrgResult[];

  if (Array.isArray(existing) && existing.length > 0) {
    // If config has a slug, try to auto-select the matching org
    if (config.orgSlug) {
      const match = existing.find((o) => o.slug === config.orgSlug);
      if (match) {
        logStep(`Using organization: ${match.name} (${match.slug})`);
        return { id: match.id, name: match.name, slug: match.slug };
      }
    }

    const choice = await askSelect('Organization', [
      { value: '_new', label: 'Create new organization' },
      ...existing.map((org) => ({
        value: org.id,
        label: `${org.name} (${org.slug})`,
      })),
    ]);

    if (choice !== '_new') {
      const org = existing.find((o) => o.id === choice)!;
      logStep(`Using organization: ${org.name}`);
      return { id: org.id, name: org.name, slug: org.slug };
    }
  }

  const name = await askText('Organization name', {
    placeholder: 'My Organization',
  });

  const suggestedSlug = config.orgSlug ?? slugify(name);
  const slug = await askText('Organization slug', {
    defaultValue: suggestedSlug,
    placeholder: suggestedSlug,
    validate: (v) => {
      if (!v || v.trim().length === 0) return 'Slug is required';
      if (!/^[a-z0-9-]+$/.test(v)) return 'Slug must be lowercase alphanumeric with hyphens';
      return undefined;
    },
  });

  // Try to get existing org by slug first (upsert-like behavior)
  try {
    const existingOrg = (await callMcpTool(adminUrl, {}, 'knowstack.get_organization', {
      slug,
    })) as unknown as OrgResult;
    logStep(`Organization ready: ${existingOrg.name} (${existingOrg.slug})`);
    return { id: existingOrg.id, name: existingOrg.name, slug: existingOrg.slug };
  } catch {
    // Not found — create new
  }

  const org = (await callMcpTool(adminUrl, {}, 'knowstack.create_organization', {
    name,
    slug,
  })) as unknown as OrgResult;

  logStep(`Organization ready: ${org.name} (${org.slug})`);
  return { id: org.id, name: org.name, slug: org.slug };
}
