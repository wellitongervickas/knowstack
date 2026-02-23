import { PrismaClient } from '@prisma/client';
import { askText, askSelect, logStep } from '@/scripts/setup/prompts';
import { DEFAULT_ORG_NAME, DEFAULT_ORG_SLUG } from '@/scripts/setup/constants';
import { slugify } from '@/scripts/setup/utils';
import { SetupConfig } from '@/scripts/setup/types';

interface OrgResult {
  id: string;
  name: string;
  slug: string;
}

export async function createOrganization(
  prisma: PrismaClient,
  config: SetupConfig,
): Promise<OrgResult> {
  const existing = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
  });

  if (existing.length > 0) {
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

  const defaultName = config.orgSlug ? undefined : DEFAULT_ORG_NAME;
  const name = await askText('Organization name', {
    defaultValue: defaultName ?? DEFAULT_ORG_NAME,
    placeholder: defaultName ?? DEFAULT_ORG_NAME,
  });

  const suggestedSlug = config.orgSlug ?? (slugify(name) || DEFAULT_ORG_SLUG);
  const slug = await askText('Organization slug', {
    defaultValue: suggestedSlug,
    placeholder: suggestedSlug,
    validate: (v) => {
      if (!v || v.trim().length === 0) return 'Slug is required';
      if (!/^[a-z0-9-]+$/.test(v)) return 'Slug must be lowercase alphanumeric with hyphens';
      return undefined;
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug },
    create: { name, slug },
    update: { name },
  });

  logStep(`Organization ready: ${org.name} (${org.slug})`);
  return { id: org.id, name: org.name, slug: org.slug };
}
