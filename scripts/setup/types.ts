import type { ContextProjectConfig } from '@/core/interfaces/config/knowstack-config.interface';

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
  total: number;
  embedded: number;
  skipped: number;
  failed: number;
  durationMs: number;
}

/** Per-profile config shape — stored in knowstack.config.ts */
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
