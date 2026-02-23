import * as fs from 'node:fs';
import * as path from 'node:path';
import { CONFIG_FILE_NAME } from '@/scripts/setup/constants';
import { SetupConfig } from '@/scripts/setup/types';
import { askSelect } from '@/scripts/setup/prompts';

const CONFIG_PATH = path.resolve(CONFIG_FILE_NAME);

/**
 * Load all profiles from knowstack.config.ts.
 * Returns empty object if the file doesn't exist.
 */
export function loadProfiles(): Record<string, SetupConfig> {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};

    // Clear require cache so re-reads pick up changes
    delete require.cache[require.resolve(CONFIG_PATH)];

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require(CONFIG_PATH);
    return (mod.default ?? mod) as Record<string, SetupConfig>;
  } catch {
    return {};
  }
}

/**
 * Select a profile by name or prompt the user.
 * - If --profile specified, use that (create empty if not found)
 * - If only one profile, use it
 * - If multiple, prompt
 * - If none, create a default "local" profile
 */
export async function selectProfile(
  profiles: Record<string, SetupConfig>,
  cliProfile?: string,
): Promise<{ name: string; config: SetupConfig }> {
  const names = Object.keys(profiles);

  if (cliProfile) {
    return {
      name: cliProfile,
      config: profiles[cliProfile] ?? {},
    };
  }

  if (names.length === 0) {
    return { name: 'local', config: {} };
  }

  if (names.length === 1) {
    return { name: names[0], config: profiles[names[0]] };
  }

  const choice = await askSelect('Select profile', [
    ...names.map((n) => ({ value: n, label: n })),
    { value: '_new', label: 'Create new profile' },
  ]);

  if (choice === '_new') {
    return { name: 'local', config: {} };
  }

  return { name: choice, config: profiles[choice] };
}

/**
 * Save all profiles to knowstack.config.ts.
 */
export function saveProfiles(profiles: Record<string, SetupConfig>): void {
  const json = JSON.stringify(profiles, null, 2);
  const content = `export default ${json} as const;\n`;
  fs.writeFileSync(CONFIG_PATH, content, 'utf-8');
}

/**
 * Parse --profile flag from process.argv.
 */
export function parseProfileArg(): string | undefined {
  const args = process.argv.slice(2);
  const idx = args.indexOf('--profile');
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return undefined;
}
