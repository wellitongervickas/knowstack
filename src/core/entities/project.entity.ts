/**
 * Project domain entity.
 * Represents a project within an organization.
 */
export interface Project {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: Date;
  updatedAt: Date;
}
