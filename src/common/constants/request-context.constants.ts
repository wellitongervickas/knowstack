/**
 * Request context validation constants.
 * Used by middleware and services that process request metadata.
 */

/**
 * Maximum allowed length for x-request-id header.
 * Prevents log bloat and potential DoS via oversized headers.
 */
export const MAX_REQUEST_ID_LENGTH = 64;

/**
 * UUID v4 pattern for validating x-request-id header.
 * Only accepts valid UUID format to prevent log injection.
 */
export const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
