/**
 * Configuration for a context project.
 * Defines which data types to share and their merge priority.
 */
export interface ContextProjectConfig {
  name: string;
  agents?: boolean | { priorityOverParent: boolean };
  commands?: boolean | { priorityOverParent: boolean };
  skills?: boolean | { priorityOverParent: boolean };
  documents?: boolean | { priorityOverParent: boolean };
  memory?: boolean | { priorityOverParent: boolean };
  templates?: boolean | { priorityOverParent: boolean };
}

export interface DocumentFile {
  title: string;
  content: string;
  relativePath: string;
}

export interface IngestResult {
  path: string;
  action: 'created' | 'updated' | 'unchanged' | 'failed';
  error?: string;
}

export interface IngestSummary {
  created: number;
  updated: number;
  unchanged: number;
  failed: number;
  docsDir: string;
}

export interface InstructionSeedResult {
  agents: number;
  skills: number;
  commands: number;
  templates: number;
}

export interface EmbedResult {
  found: number;
  total: number;
  embedded: number;
  skipped: number;
  failed: number;
  durationMs: number;
}

/** Per-profile config shape — stored in knowstack.config.json */
export interface SetupConfig {
  mcpUrl?: string;
  orgSlug?: string;
  projectSlug?: string;
  docsDir?: string;
  contextProjects?: ContextProjectConfig[];
}

export interface SetupResult {
  orgName: string;
  orgSlug: string;
  projectName: string;
  projectSlug: string;
  mcpUrl: string;
  documents: IngestSummary;
  instructions: InstructionSeedResult;
  embeddings?: {
    documents: EmbedResult | null;
    instructions: EmbedResult | null;
  };
  contextProjects?: ContextProjectConfig[];
}
