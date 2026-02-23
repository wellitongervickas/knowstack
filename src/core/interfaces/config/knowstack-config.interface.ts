/**
 * KnowStack project configuration.
 * Loaded from `knowstack.config.ts` in the project root.
 * Defines organization, project, and cross-project context sharing.
 */
export interface KnowStackConfig {
  /** Deployment mode: 'local' for localhost, 'external' for custom server URL. */
  mode: 'local' | 'external';

  /** Organization slug. */
  org: string;

  /** Current project slug within the organization. */
  project: string;

  /** Other projects in the same org to pull context from. */
  contextProjects?: ContextProjectConfig[];
}

/**
 * Configuration for a context project.
 * Defines which data types to share and their merge priority.
 *
 * - `true` enables the type with default priority (no override)
 * - `{ priorityOverParent: true }` lets this project override the parent
 * - `undefined` or missing means the type is NOT shared
 */
export interface ContextProjectConfig {
  /** Project slug in the same organization. */
  name: string;

  /** Share agent instructions from this project. */
  agents?: boolean | { priorityOverParent: boolean };

  /** Share command instructions from this project. */
  commands?: boolean | { priorityOverParent: boolean };

  /** Share skill instructions from this project. */
  skills?: boolean | { priorityOverParent: boolean };

  /** Share documents from this project. */
  documents?: boolean | { priorityOverParent: boolean };

  /** Share memory entries from this project. */
  memory?: boolean | { priorityOverParent: boolean };

  /** Share template instructions from this project. */
  templates?: boolean | { priorityOverParent: boolean };
}

/**
 * Resolved context project — after slug-to-ID resolution.
 */
export interface ResolvedContextProject {
  /** Project database ID. */
  id: string;

  /** Project slug. */
  slug: string;

  /** Original configuration from the config file. */
  config: ContextProjectConfig;
}
