/**
 * Shared application constants.
 * Only truly cross-cutting values that don't belong to a specific module.
 *
 * Module-specific constants are located in:
 * - @/application/audit/audit.constants - Audit enums, rate limits, pagination
 * - @/application/instructions/instructions.constants - Instruction defaults
 * - @/application/mcp/mcp.constants - MCP tool names, descriptions
 * - @/application/security/security.constants - Security headers
 * - @/application/ingestion/ingestion.constants - Source types
 * - @/application/embedding/embedding.constants - Embedding config, search types
 */

// =============================================================================
// APPLICATION METADATA
// =============================================================================

/**
 * Application name.
 */
export const APP_NAME = 'KnowStack';

/**
 * Application version.
 * Update this when releasing new versions.
 */
export const APP_VERSION = '1.0.0';

/**
 * User-Agent string for outbound HTTP requests.
 */
export const USER_AGENT = `${APP_NAME}/${APP_VERSION}`;

// =============================================================================
// TIME CONVERSIONS
// =============================================================================

/**
 * Seconds per minute.
 */
export const SECONDS_PER_MINUTE = 60;

/**
 * Seconds per hour.
 */
export const SECONDS_PER_HOUR = 60 * 60;

/**
 * Seconds per day.
 */
export const SECONDS_PER_DAY = 60 * 60 * 24;

/**
 * Milliseconds per second.
 */
export const MS_PER_SECOND = 1000;

// =============================================================================
// HTTP & NETWORKING DEFAULTS
// =============================================================================

/**
 * Default fetch timeout in milliseconds.
 */
export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

/**
 * Maximum content size for URL fetching (1MB).
 */
export const MAX_CONTENT_SIZE_BYTES = 1024 * 1024;
