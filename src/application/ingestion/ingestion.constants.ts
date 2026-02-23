/**
 * Ingestion module constants.
 */

// ============= Source Types =============

/**
 * Document source types for ingestion.
 * Maps to SourceType in core/entities/document.entity.ts.
 */
export const SOURCE_TYPES = {
  MANUAL: 'MANUAL',
  URL: 'URL',
} as const;

export type SourceTypeValue = (typeof SOURCE_TYPES)[keyof typeof SOURCE_TYPES];
