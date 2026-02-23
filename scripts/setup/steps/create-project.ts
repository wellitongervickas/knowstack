import { PrismaClient } from '@prisma/client';
import { askText, askSelect, logStep } from '@/scripts/setup/prompts';
import { DEFAULT_PROJECT_NAME, DEFAULT_PROJECT_SLUG } from '@/scripts/setup/constants';
import { slugify } from '@/scripts/setup/utils';
import { SetupConfig } from '@/scripts/setup/types';

interface ProjectResult {
  id: string;
  name: string;
  slug: string;
}

export async function createProject(
  prisma: PrismaClient,
  organizationId: string,
  config: SetupConfig,
): Promise<ProjectResult> {
  const existing = await prisma.project.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });

  if (existing.length > 0) {
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

  const defaultName = config.projectSlug ? undefined : DEFAULT_PROJECT_NAME;
  const name = await askText('Project name', {
    defaultValue: defaultName ?? DEFAULT_PROJECT_NAME,
    placeholder: defaultName ?? DEFAULT_PROJECT_NAME,
  });

  const suggestedSlug = config.projectSlug ?? (slugify(name) || DEFAULT_PROJECT_SLUG);
  const slug = await askText('Project slug', {
    defaultValue: suggestedSlug,
    placeholder: suggestedSlug,
    validate: (v) => {
      if (!v || v.trim().length === 0) return 'Slug is required';
      if (!/^[a-z0-9-]+$/.test(v)) return 'Slug must be lowercase alphanumeric with hyphens';
      return undefined;
    },
  });

  const project = await prisma.project.upsert({
    where: { organizationId_slug: { organizationId, slug } },
    create: { organizationId, name, slug },
    update: { name },
  });

  logStep(`Project ready: ${project.name} (${project.slug})`);
  return { id: project.id, name: project.name, slug: project.slug };
}
