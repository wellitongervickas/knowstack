/**
 * Audit log constants and enums.
 * Defines the taxonomy for audit events.
 */

/**
 * Categories for audit log entries.
 */
export enum AuditCategory {
  DOCUMENT = 'DOCUMENT',
  ADMIN = 'ADMIN',
  AUDIT = 'AUDIT',
  INSTRUCTION = 'INSTRUCTION',
  QUERY = 'QUERY',
}

/**
 * Audit action types organized by category.
 */
export enum AuditAction {
  // DOCUMENT category
  DOCUMENT_CREATED = 'DOCUMENT_CREATED',
  DOCUMENT_UPDATED = 'DOCUMENT_UPDATED',
  DOCUMENT_DELETED = 'DOCUMENT_DELETED',

  // ADMIN category
  ORG_CREATED = 'ORG_CREATED',
  ORG_UPDATED = 'ORG_UPDATED',
  ORG_DELETED = 'ORG_DELETED',
  PROJECT_CREATED = 'PROJECT_CREATED',
  PROJECT_UPDATED = 'PROJECT_UPDATED',
  PROJECT_DELETED = 'PROJECT_DELETED',

  // AUDIT category (audit-of-audit for security monitoring)
  AUDIT_LOG_QUERIED = 'AUDIT_LOG_QUERIED',
  AUDIT_LOG_EXPORTED = 'AUDIT_LOG_EXPORTED',

  // INSTRUCTION category
  INSTRUCTION_CREATED = 'INSTRUCTION_CREATED',
  INSTRUCTION_UPDATED = 'INSTRUCTION_UPDATED',
  INSTRUCTION_DELETED = 'INSTRUCTION_DELETED',

  // QUERY category
  QUERY_EXECUTED = 'QUERY_EXECUTED',
  SEARCH_EXECUTED = 'SEARCH_EXECUTED',
}

/**
 * Resource types for audit log entries.
 */
export enum ResourceType {
  ORGANIZATION = 'Organization',
  PROJECT = 'Project',
  DOCUMENT = 'Document',
  AUDIT_LOG = 'AuditLog',
  INSTRUCTION = 'Instruction',
  QUERY = 'Query',
}

/**
 * Sensitive keys to strip from metadata.
 * Case-insensitive matching is used.
 * Comprehensive list to prevent sensitive data leakage.
 */
export const SENSITIVE_METADATA_KEYS = [
  // Authentication & tokens
  'password',
  'pass',
  'pw',
  'passwd',
  'token',
  'secret',
  'otp',
  'key',
  'authorization',
  'auth',
  'credential',
  'cred',
  'apikey',
  'api_key',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'bearer',
  'jwt',
  // Cryptographic
  'private',
  'hash',
  'signature',
  'cert',
  'certificate',
  'encryption',
  // Session & cookies
  'cookie',
  'session',
  'csrf',
  'xsrf',
  // Personal identifiable information (PII)
  'ssn',
  'social_security',
  'credit',
  'card_number',
  'cvv',
  'pin',
  // Database & connection strings
  'connection_string',
  'database_url',
  'db_password',
] as const;

// =============================================================================
// RATE LIMITS (requests per window)
// =============================================================================

/**
 * Rate limit TTL in milliseconds (1 minute window).
 */
export const RATE_LIMIT_TTL_MS = 60_000;

/**
 * Rate limit for admin audit log query endpoint.
 * Allows 30 requests per minute.
 */
export const RATE_LIMIT_ADMIN_QUERY = 30;

/**
 * Rate limit for user self-access audit log endpoint.
 * Allows 10 requests per minute.
 */
export const RATE_LIMIT_USER_QUERY = 10;

/**
 * Rate limit for audit log export endpoint (expensive operation).
 * Allows 5 requests per minute.
 */
export const RATE_LIMIT_EXPORT = 5;

// =============================================================================
// PAGINATION DEFAULTS
// =============================================================================

/**
 * Default page number for paginated queries.
 */
export const DEFAULT_PAGE = 1;

/**
 * Default page size for paginated queries.
 */
export const DEFAULT_LIMIT = 50;

/**
 * Maximum page size for paginated queries.
 */
export const MAX_LIMIT = 100;

/**
 * Maximum allowed export date range in days (90 days).
 * Prevents excessive database load and memory usage.
 */
export const MAX_EXPORT_RANGE_DAYS = 90;

/**
 * Milliseconds per day (used for date calculations).
 */
export const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Batch size for streaming export operations.
 * Used to paginate large result sets during export.
 */
export const EXPORT_BATCH_SIZE = 500;
