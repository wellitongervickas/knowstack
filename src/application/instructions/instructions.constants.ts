/**
 * Instruction module constants.
 *
 * Centralizes defaults and configuration for instruction
 * listing, filtering, and validation.
 */

// ============= Pagination Defaults =============

export const INSTRUCTION_DEFAULTS = {
  /** Default page size for instruction listing */
  LIST_PAGE_SIZE: 20,
  /** Maximum allowed page size for instruction listing */
  LIST_MAX_PAGE_SIZE: 100,
  /** Maximum length for instruction name */
  NAME_MAX_LENGTH: 100,
  /** Maximum length for instruction description */
  DESCRIPTION_MAX_LENGTH: 500,
  /** Default result limit for instruction search */
  SEARCH_DEFAULT_LIMIT: 10,
  /** Maximum result limit for instruction search */
  SEARCH_MAX_LIMIT: 50,
  /** Maximum query length for instruction search */
  SEARCH_QUERY_MAX_LENGTH: 200,
} as const;

// ============= Enum Arrays =============

/** Valid instruction types for validation. */
export const INSTRUCTION_TYPES = ['AGENT', 'COMMAND', 'MEMORY', 'SKILL', 'TEMPLATE'] as const;

/** Valid instruction visibility values for validation. */
export const INSTRUCTION_VISIBILITIES = ['PUBLIC', 'ORGANIZATION', 'PRIVATE'] as const;

/** Visibility values allowed when creating via API (PUBLIC is seed-script only). */
export const INSTRUCTION_API_VISIBILITIES = ['ORGANIZATION', 'PRIVATE'] as const;

// ============= Memory Defaults =============

/** Default description for AI-managed memory entries created via MCP. */
export const MEMORY_DEFAULT_DESCRIPTION = 'AI-managed memory entry';

// ============= Search Scoring Weights =============

/** Weighted scoring for instruction keyword search. */
export const INSTRUCTION_SEARCH_WEIGHTS = {
  NAME: 0.5,
  DESCRIPTION: 0.3,
  CONTENT: 0.2,
} as const;
