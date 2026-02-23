/**
 * Security module constants.
 * Static values that don't change based on environment.
 *
 * Environment-configurable values live in app.settings.ts.
 * Dynamic config values (key version, algorithm override) live in encryption.config.ts.
 */

// =============================================================================
// SECURITY HTTP HEADERS
// =============================================================================

/** Security response header names. */
export const SECURITY_HEADERS = {
  DATA_PRIVACY: 'X-Data-Privacy',
  ENCRYPTION_STATUS: 'X-Encryption-Status',
  CONTENT_TYPE_OPTIONS: 'X-Content-Type-Options',
  FRAME_OPTIONS: 'X-Frame-Options',
  STRICT_TRANSPORT_SECURITY: 'Strict-Transport-Security',
} as const;

/** Static values for security response headers. */
export const SECURITY_HEADER_VALUES = {
  DATA_PRIVACY: 'no-ai-training',
  CONTENT_TYPE_OPTIONS: 'nosniff',
  FRAME_OPTIONS: 'DENY',
  HSTS: 'max-age=31536000; includeSubDomains',
} as const;

// =============================================================================
// ENCRYPTION
// =============================================================================

/** Encryption algorithm identifier. */
export const ENCRYPTION_ALGORITHM = 'aes-256-gcm';

/** Encryption key size in bits. */
export const ENCRYPTION_KEY_SIZE_BITS = 256;

/** GCM recommended IV length in bytes. */
export const ENCRYPTION_IV_LENGTH = 12;

/** GCM auth tag length in bytes. */
export const ENCRYPTION_AUTH_TAG_LENGTH = 16;

/** Encryption key length in bytes (256 bits). */
export const ENCRYPTION_KEY_BYTES = 32;

/** Encryption key length in hex characters. */
export const ENCRYPTION_KEY_HEX_LENGTH = 64;

// =============================================================================
// ENCRYPTION CONFIG KEYS (typed keys for ConfigService.get lookups)
// =============================================================================

/** Typed keys for `configService.get(...)` lookups against the `encryption` namespace. */
export const ENCRYPTION_CONFIG_KEYS = {
  KEY: 'encryption.key',
  ALGORITHM: 'encryption.algorithm',
} as const;

// =============================================================================
// TLS
// =============================================================================

/** TLS protocol description. */
export const TLS_PROTOCOL = 'TLS 1.2+';

/** TLS capability note. */
export const TLS_NOTE = 'Actual TLS version depends on client capabilities';

// =============================================================================
// DATA RETENTION (static policy text)
// =============================================================================

/** Session data retention policy. */
export const SESSION_RETENTION = '7 days after expiration';

/** Document data retention policy. */
export const DOCUMENT_RETENTION = 'Until deleted by user';

// =============================================================================
// AI PROVIDER POLICY
// =============================================================================

/** OpenAI data handling policy. */
export const OPENAI_PROVIDER_POLICY = {
  NAME: 'OpenAI',
  DATA_RETENTION: '30 days (OpenAI default unless opted into ZDR)',
  DOCUMENTATION_URL: 'https://openai.com/policies/api-data-usage-policies',
  ZDR_NOTE: 'Requires OpenAI organization opt-in (see OpenAI docs)',
} as const;
