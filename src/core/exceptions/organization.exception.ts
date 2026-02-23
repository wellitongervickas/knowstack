import { DomainException } from './domain.exception';

/**
 * Thrown when an organization is not found.
 * Uses a static message to prevent leaking identifiers in API responses.
 */
export class OrganizationNotFoundException extends DomainException {
  constructor() {
    super('Organization not found', 'ORGANIZATION_NOT_FOUND');
    this.name = 'OrganizationNotFoundException';
  }
}

/**
 * Thrown when an organization slug is already taken.
 */
export class OrganizationSlugTakenException extends DomainException {
  constructor(slug: string) {
    super(`Organization slug '${slug}' is already taken`, 'ORGANIZATION_SLUG_TAKEN');
    this.name = 'OrganizationSlugTakenException';
  }
}
