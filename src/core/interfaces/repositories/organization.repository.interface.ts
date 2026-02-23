import {
  Organization,
  OrganizationWithStats,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '@/core/entities/organization.entity';

/**
 * Repository interface for organization operations.
 * Infrastructure layer must implement this interface.
 */
export interface IOrganizationRepository {
  /**
   * Find an organization by ID.
   */
  findById(id: string): Promise<Organization | null>;

  /**
   * Find an organization by ID with stats.
   */
  findByIdWithStats(id: string): Promise<OrganizationWithStats | null>;

  /**
   * Find an organization by slug.
   */
  findBySlug(slug: string): Promise<Organization | null>;

  /**
   * Check if a slug is already taken.
   */
  isSlugTaken(slug: string): Promise<boolean>;

  /**
   * Create a new organization.
   */
  create(data: CreateOrganizationInput): Promise<Organization>;

  /**
   * Update an organization.
   */
  update(id: string, data: UpdateOrganizationInput): Promise<Organization>;

  /**
   * Delete an organization.
   */
  delete(id: string): Promise<void>;
}

export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');
