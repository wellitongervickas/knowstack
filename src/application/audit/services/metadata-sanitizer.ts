import { Injectable } from '@nestjs/common';
import { SENSITIVE_METADATA_KEYS } from '@/application/audit/audit.constants';
import { AuditLogMetadata } from '@/core/entities/audit-log.entity';

/**
 * Service for sanitizing metadata before storing in audit logs.
 * Removes sensitive fields that should never be logged.
 */
@Injectable()
export class MetadataSanitizer {
  private readonly sensitivePatterns: RegExp[];

  constructor() {
    // Create case-insensitive patterns for each sensitive key
    this.sensitivePatterns = SENSITIVE_METADATA_KEYS.map((key) => new RegExp(key, 'i'));
  }

  /**
   * Sanitize metadata by removing sensitive keys.
   * Performs deep sanitization on nested objects.
   *
   * @param metadata - The metadata object to sanitize
   * @returns A new object with sensitive keys removed
   */
  sanitize(metadata: AuditLogMetadata | undefined | null): AuditLogMetadata {
    if (!metadata || typeof metadata !== 'object') {
      return {};
    }

    return this.sanitizeObject(metadata);
  }

  /**
   * Check if a key matches any sensitive pattern.
   */
  isSensitiveKey(key: string): boolean {
    return this.sensitivePatterns.some((pattern) => pattern.test(key));
  }

  /**
   * Recursively sanitize an object.
   */
  private sanitizeObject(obj: Record<string, unknown>): AuditLogMetadata {
    const sanitized: AuditLogMetadata = {};

    for (const [key, value] of Object.entries(obj)) {
      // Skip sensitive keys
      if (this.isSensitiveKey(key)) {
        continue;
      }

      // Recursively sanitize nested objects
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeObject(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        // Sanitize arrays (filter out objects with sensitive data, keep primitives)
        sanitized[key] = this.sanitizeArray(value);
      } else {
        // Keep primitive values
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Sanitize an array, recursively sanitizing nested objects.
   */
  private sanitizeArray(arr: unknown[]): unknown[] {
    return arr.map((item) => {
      if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
        return this.sanitizeObject(item as Record<string, unknown>);
      } else if (Array.isArray(item)) {
        return this.sanitizeArray(item);
      }
      return item;
    });
  }
}
