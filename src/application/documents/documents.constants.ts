/**
 * Document Access module constants.
 *
 * Centralizes magic numbers and configuration defaults
 * for document listing, search, and detail endpoints.
 */

// ============= Configuration Defaults =============

export const DOCUMENT_DEFAULTS = {
  /** Maximum characters shown in content preview (list and search results) */
  CONTENT_PREVIEW_LENGTH: 200,
  /** Suffix appended when content exceeds preview length */
  CONTENT_PREVIEW_SUFFIX: '...',
  /** Default page size for document listing */
  LIST_PAGE_SIZE: 20,
  /** Maximum allowed page size for document listing */
  LIST_MAX_PAGE_SIZE: 100,
  /** Default result limit for search queries */
  SEARCH_DEFAULT_LIMIT: 10,
  /** Maximum allowed result limit for search queries */
  SEARCH_MAX_LIMIT: 50,
  /** Maximum length for search query string */
  SEARCH_QUERY_MAX_LENGTH: 200,
} as const;

// ============= Search Scoring =============

export const DOCUMENT_SCORING = {
  /** Weight for title matches in keyword search (0-1) */
  TITLE_WEIGHT: 0.6,
  /** Weight for content matches in keyword search (0-1) */
  CONTENT_WEIGHT: 0.4,
  /** Normalization length for title field (characters) */
  TITLE_NORM_LENGTH: 100,
  /** Normalization length for content field (characters) */
  CONTENT_NORM_LENGTH: 500,
} as const;
