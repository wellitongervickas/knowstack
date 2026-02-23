import { z } from 'zod';

/**
 * Zod raw shapes for MCP tool parameter validation.
 *
 * Passed to `server.registerTool(name, { inputSchema }, handler)`.
 * The SDK validates input automatically and provides typed `args` in the handler callback.
 */

/** Shared visibility filter for instruction tools. */
const visibilityParam = z
  .enum(['PUBLIC', 'ORGANIZATION', 'PRIVATE'])
  .optional()
  .describe(
    'Filter by visibility tier. Omit to get merged results (PUBLIC < ORGANIZATION < PRIVATE)',
  );

// =============================================================================
// QUERY
// =============================================================================

export const QueryToolParams = {
  query: z.string().max(4000),
  context: z.string().max(100).optional(),
};

// =============================================================================
// DOCUMENTS — unified get/save/delete
// =============================================================================

/** Parameters for knowstack.get_documents — list, search, or get by ID. */
export const GetDocumentsToolParams = {
  id: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional()
    .describe('Get a specific document by ID'),
  q: z.string().min(1).max(200).optional().describe('Search documents by keyword'),
  page: z.number().int().min(1).default(1).optional(),
  limit: z.number().int().min(1).max(100).default(20).optional(),
  sourceType: z.enum(['MANUAL', 'URL']).optional(),
};

/** Parameters for knowstack.save_documents (raw shape for SDK inputSchema registration). */
export const SaveDocumentsToolParams = {
  title: z.string().min(1).max(500).optional().describe('Document title'),
  content: z.string().min(1).optional().describe('Document content (markdown)'),
  sourceType: z.enum(['MANUAL', 'URL']).optional().describe('Source type (default: MANUAL)'),
  sourceUrl: z.string().url().optional().describe('Original source URL'),
};

/**
 * Refined validation for save_documents with cross-field constraints.
 * Used in the handler (not as inputSchema) because ZodEffects breaks SDK JSON Schema generation.
 *
 * Rules:
 * - Manual mode: `content` is provided → `title` is required
 * - URL mode: `sourceUrl` without `content` → auto-fetches content (title optional, extracted from page)
 * - At least one of `content` or `sourceUrl` must be provided
 */
export const SaveDocumentsValidation = z
  .object(SaveDocumentsToolParams)
  .refine((data) => data.content || data.sourceUrl, {
    message: 'Either content or sourceUrl must be provided',
  })
  .refine((data) => !data.content || data.title, {
    message: 'title is required when content is provided',
  });

/** Parameters for knowstack.delete_documents. */
export const DeleteDocumentsToolParams = {
  id: z
    .string()
    .min(1)
    .max(255)
    .regex(/^[a-zA-Z0-9_-]+$/)
    .describe('Document ID to delete'),
};

// =============================================================================
// INSTRUCTIONS — get/save/delete per type
// =============================================================================

/** Shared parameters for get_agents, get_commands, get_skills, get_memory. */
export const GetAgentsToolParams = {
  name: z.string().max(100).optional().describe('Filter by agent name (exact match)'),
  visibility: visibilityParam,
};

export const GetCommandsToolParams = {
  name: z.string().max(100).optional().describe('Filter by command name (exact match)'),
  visibility: visibilityParam,
};

export const GetSkillsToolParams = {
  name: z.string().max(100).optional().describe('Filter by skill name (exact match)'),
  visibility: visibilityParam,
};

export const GetTemplatesToolParams = {
  name: z.string().max(100).optional().describe('Filter by template name (exact match)'),
  visibility: visibilityParam,
};

export const GetMemoryToolParams = {
  name: z.string().max(100).optional().describe('Filter by memory entry name (exact match)'),
  visibility: visibilityParam,
};

/** Shared parameters for save_agents, save_commands, save_skills, save_templates. */
const saveInstructionParams = {
  name: z.string().min(1).max(100).describe('Instruction name'),
  description: z.string().min(1).max(500).describe('Short description'),
  content: z.string().min(1).optional().describe('Full markdown content'),
  metadata: z.record(z.string(), z.unknown()).optional().describe('Optional metadata'),
  visibility: visibilityParam,
  sourceUrl: z.string().url().optional().describe('Source URL to auto-fetch content from'),
};

export const SaveAgentsToolParams = { ...saveInstructionParams };
export const SaveCommandsToolParams = { ...saveInstructionParams };
export const SaveSkillsToolParams = { ...saveInstructionParams };
export const SaveTemplatesToolParams = { ...saveInstructionParams };

/**
 * Refined validation for save instruction tools with cross-field constraints.
 * Used in the handler (not as inputSchema) because ZodEffects breaks SDK JSON Schema generation.
 *
 * Rules:
 * - Manual mode: `content` is provided directly
 * - URL mode: `sourceUrl` without `content` → auto-fetches content
 * - At least one of `content` or `sourceUrl` must be provided
 */
export const SaveInstructionValidation = z
  .object(saveInstructionParams)
  .refine((data) => data.content || data.sourceUrl, {
    message: 'Either content or sourceUrl must be provided',
  });

/** Shared parameters for delete_agents, delete_commands, delete_skills. */
const deleteInstructionParams = {
  name: z.string().min(1).max(100).describe('Instruction name to delete'),
};

export const DeleteAgentsToolParams = { ...deleteInstructionParams };
export const DeleteCommandsToolParams = { ...deleteInstructionParams };
export const DeleteSkillsToolParams = { ...deleteInstructionParams };
export const DeleteTemplatesToolParams = { ...deleteInstructionParams };

// =============================================================================
// MEMORY — specialized save/update/delete
// =============================================================================

export const SaveMemoryToolParams = {
  name: z.string().min(1).max(100).describe('Name of the memory entry'),
  content: z.string().min(1).describe('Markdown content for the memory entry'),
};

export const UpdateMemoryToolParams = {
  name: z.string().min(1).max(100).describe('Name of the memory entry to update'),
  old_str: z
    .string()
    .min(1)
    .describe('Text to find in the memory content (must match exactly once)'),
  new_str: z.string().describe('Replacement text'),
};

export const DeleteMemoryToolParams = {
  name: z.string().min(1).max(100).describe('Name of the memory entry to delete'),
};

// =============================================================================
// SEARCH
// =============================================================================

export const SearchInstructionsToolParams = {
  q: z.string().min(1).max(200).describe('Keyword search query'),
  type: z
    .enum(['AGENT', 'COMMAND', 'MEMORY', 'SKILL', 'TEMPLATE'])
    .optional()
    .describe('Filter by instruction type'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .optional()
    .describe('Maximum results to return'),
  visibility: visibilityParam,
};

// =============================================================================
// BACKFILL
// =============================================================================

export const BackfillEmbeddingsToolParams = {
  force: z
    .boolean()
    .optional()
    .describe('Force regenerate all embeddings (default: false, only missing/stale)'),
  dryRun: z.boolean().optional().describe('Estimate cost without embedding (default: false)'),
};

export const BackfillInstructionsToolParams = {
  type: z
    .enum(['AGENT', 'COMMAND', 'MEMORY', 'SKILL', 'TEMPLATE'])
    .optional()
    .describe('Filter by instruction type (omit to backfill all types)'),
  force: z
    .boolean()
    .optional()
    .describe('Force regenerate all embeddings (default: false, only missing/stale)'),
  dryRun: z.boolean().optional().describe('Estimate cost without embedding (default: false)'),
};
