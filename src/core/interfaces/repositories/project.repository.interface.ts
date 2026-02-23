import { Project } from '@/core/entities/project.entity';

/**
 * Repository interface for project operations.
 * Infrastructure layer must implement this interface.
 */
export interface IProjectRepository {
  /**
   * Create a new project.
   */
  create(data: { organizationId: string; name: string; slug: string }): Promise<Project>;

  /**
   * Find a project by ID.
   */
  findById(id: string): Promise<Project | null>;

  /**
   * Find a project by organization ID and slug.
   */
  findBySlug(organizationId: string, slug: string): Promise<Project | null>;

  /**
   * Find all projects by organization ID.
   */
  findByOrganizationId(organizationId: string): Promise<Project[]>;

  /**
   * Update a project.
   */
  update(
    id: string,
    data: {
      name?: string;
      slug?: string;
    },
  ): Promise<Project>;

  /**
   * Delete a project.
   */
  delete(id: string): Promise<void>;

  /**
   * Check if a slug is already taken within an organization.
   */
  isSlugTaken(organizationId: string, slug: string, excludeId?: string): Promise<boolean>;
}

export const PROJECT_REPOSITORY = Symbol('PROJECT_REPOSITORY');
