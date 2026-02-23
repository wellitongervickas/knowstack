import * as fs from 'node:fs';
import * as path from 'node:path';
import { CONFIG_FILE_NAME } from './constants';
import { SetupConfig } from './types';
import { askSelect } from './prompts';

const CONFIG_PATH = path.resolve(CONFIG_FILE_NAME);

/**
 * Load all profiles from knowstack.config.json.
 * Returns empty object if the file doesn't exist.
 */
export function loadProfiles(): Record<string, SetupConfig> {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(content) as Record<string, SetupConfig>;
  } catch {
    return {};
  }
}

/**
 * Select a profile by name or prompt the user.
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
 * Save all profiles to knowstack.config.json.
 */
export function saveProfiles(profiles: Record<string, SetupConfig>): void {
  const content = JSON.stringify(profiles, null, 2) + '\n';
  fs.writeFileSync(CONFIG_PATH, content, 'utf-8');
}
