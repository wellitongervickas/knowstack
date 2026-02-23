import { DomainException } from './domain.exception';

/**
 * Thrown when a project is not found.
 * Uses a static message to prevent leaking identifiers in API responses.
 */
export class ProjectNotFoundException extends DomainException {
  constructor() {
    super('Project not found', 'PROJECT_NOT_FOUND');
    this.name = 'ProjectNotFoundException';
  }
}

/**
 * Thrown when a project slug is already taken within an organization.
 */
export class ProjectSlugTakenException extends DomainException {
  constructor(slug: string) {
    super(`Project slug '${slug}' is already taken within this organization`, 'PROJECT_SLUG_TAKEN');
    this.name = 'ProjectSlugTakenException';
  }
}
