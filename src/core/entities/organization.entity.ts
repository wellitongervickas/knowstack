/**
 * Organization domain entity.
 * Represents a tenant organization in the system.
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Organization with project count.
 */
export interface OrganizationWithStats extends Organization {
  projectCount: number;
}

/**
 * Input for creating a new organization.
 */
export interface CreateOrganizationInput {
  name: string;
  slug: string;
}

/**
 * Input for updating an organization.
 */
export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
}
