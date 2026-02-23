import { Injectable } from '@nestjs/common';

/**
 * Options for slug normalization and validation.
 */
export interface SlugOptions {
  minLength: number;
  maxLength: number;
  pattern: RegExp;
}

/**
 * Service for normalizing and validating slugs.
 * Extracts common slug handling logic for reuse across modules.
 */
@Injectable()
export class SlugService {
  /**
   * Normalize a slug: lowercase, trim, replace spaces with hyphens,
   * remove invalid characters, collapse multiple hyphens, trim edge hyphens.
   */
  normalize(slug: string): string {
    return slug
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Validate a slug against the provided options.
   * Throws an error if validation fails.
   *
   * @param slug - The slug to validate
   * @param options - Validation options (min/max length, pattern)
   * @param createException - Factory function to create the appropriate exception
   */
  validate<T extends Error>(
    slug: string,
    options: SlugOptions,
    createException: (message: string) => T,
  ): void {
    if (slug.length < options.minLength) {
      throw createException(`Slug must be at least ${options.minLength} character(s).`);
    }

    if (slug.length > options.maxLength) {
      throw createException(`Slug must be at most ${options.maxLength} characters.`);
    }

    if (!options.pattern.test(slug)) {
      throw createException('Slug can only contain lowercase letters, numbers, and hyphens.');
    }
  }

  /**
   * Normalize and validate a slug in one operation.
   *
   * @param slug - The raw slug to process
   * @param options - Validation options (min/max length, pattern)
   * @param createException - Factory function to create the appropriate exception
   * @returns The normalized slug
   */
  normalizeAndValidate<T extends Error>(
    slug: string,
    options: SlugOptions,
    createException: (message: string) => T,
  ): string {
    const normalized = this.normalize(slug);
    this.validate(normalized, options, createException);
    return normalized;
  }
}
