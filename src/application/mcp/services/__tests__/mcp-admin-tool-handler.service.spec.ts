import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpAdminToolHandlerService } from '@/application/mcp/services/mcp-admin-tool-handler.service';
import type { IOrganizationRepository } from '@/core/interfaces/repositories/organization.repository.interface';
import type { IProjectRepository } from '@/core/interfaces/repositories/project.repository.interface';
import type { IStructuredLogger } from '@/core/interfaces/services/observability.interface';
import type { Organization } from '@/core/entities/organization.entity';
import type { Project } from '@/core/entities/project.entity';

const createTestOrg = (overrides: Partial<Organization> = {}): Organization => ({
  id: 'org-1',
  name: 'Test Org',
  slug: 'test-org',
  createdAt: new Date('2026-01-15T10:00:00.000Z'),
  updatedAt: new Date('2026-01-15T10:00:00.000Z'),
  ...overrides,
});

const createTestProject = (overrides: Partial<Project> = {}): Project => ({
  id: 'proj-1',
  organizationId: 'org-1',
  name: 'Test Project',
  slug: 'test-project',
  createdAt: new Date('2026-01-15T10:00:00.000Z'),
  updatedAt: new Date('2026-01-15T10:00:00.000Z'),
  ...overrides,
});

describe('McpAdminToolHandlerService — Organizations', () => {
  let service: McpAdminToolHandlerService;
  let mockOrgRepo: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByIdWithStats: ReturnType<typeof vi.fn>;
    findBySlug: ReturnType<typeof vi.fn>;
    isSlugTaken: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockProjectRepo: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findBySlug: ReturnType<typeof vi.fn>;
    findByOrganizationId: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    isSlugTaken: ReturnType<typeof vi.fn>;
  };
  let mockLogger: IStructuredLogger;

  beforeEach(() => {
    mockOrgRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByIdWithStats: vi.fn(),
      findBySlug: vi.fn(),
      isSlugTaken: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockProjectRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      findByOrganizationId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      isSlugTaken: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as IStructuredLogger;

    service = new McpAdminToolHandlerService(
      mockOrgRepo as unknown as IOrganizationRepository,
      mockProjectRepo as unknown as IProjectRepository,
      mockLogger,
    );
  });

  describe('handleCreateOrganization', () => {
    it('should create organization and return created status', async () => {
      const org = createTestOrg();
      mockOrgRepo.isSlugTaken.mockResolvedValue(false);
      mockOrgRepo.create.mockResolvedValue(org);

      const result = await service.handleCreateOrganization({
        name: 'Test Org',
        slug: 'test-org',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe('org-1');
      expect(data.name).toBe('Test Org');
      expect(data.slug).toBe('test-org');
      expect(data.status).toBe('created');
    });

    it('should return error when slug is already taken', async () => {
      mockOrgRepo.isSlugTaken.mockResolvedValue(true);

      const result = await service.handleCreateOrganization({
        name: 'Test Org',
        slug: 'test-org',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("'test-org' is already taken");
      expect(mockOrgRepo.create).not.toHaveBeenCalled();
    });

    it('should handle unexpected errors gracefully', async () => {
      mockOrgRepo.isSlugTaken.mockRejectedValue(new Error('DB error'));

      const result = await service.handleCreateOrganization({
        name: 'Test Org',
        slug: 'test-org',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('unexpected error');
    });
  });

  describe('handleGetOrganization', () => {
    it('should return organization with project count', async () => {
      const org = createTestOrg();
      mockOrgRepo.findBySlug.mockResolvedValue(org);
      mockOrgRepo.findByIdWithStats.mockResolvedValue({ ...org, projectCount: 3 });

      const result = await service.handleGetOrganization({ slug: 'test-org' });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe('org-1');
      expect(data.slug).toBe('test-org');
      expect(data.projectCount).toBe(3);
    });

    it('should return error when organization not found', async () => {
      mockOrgRepo.findBySlug.mockResolvedValue(null);

      const result = await service.handleGetOrganization({ slug: 'nonexistent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Organization not found');
    });
  });

  describe('handleListOrganizations', () => {
    it('should return all organizations', async () => {
      const orgs = [
        createTestOrg({ id: 'org-1', name: 'Org A', slug: 'org-a' }),
        createTestOrg({ id: 'org-2', name: 'Org B', slug: 'org-b' }),
      ];
      mockOrgRepo.findAll.mockResolvedValue(orgs);

      const result = await service.handleListOrganizations();

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveLength(2);
      expect(data[0].slug).toBe('org-a');
      expect(data[1].slug).toBe('org-b');
    });

    it('should return empty array when no organizations exist', async () => {
      mockOrgRepo.findAll.mockResolvedValue([]);

      const result = await service.handleListOrganizations();

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data).toEqual([]);
    });
  });
});

describe('McpAdminToolHandlerService — Projects', () => {
  let service: McpAdminToolHandlerService;
  let mockOrgRepo: {
    findAll: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findByIdWithStats: ReturnType<typeof vi.fn>;
    findBySlug: ReturnType<typeof vi.fn>;
    isSlugTaken: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  let mockProjectRepo: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    findBySlug: ReturnType<typeof vi.fn>;
    findByOrganizationId: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    isSlugTaken: ReturnType<typeof vi.fn>;
  };
  let mockLogger: IStructuredLogger;

  const testOrg = createTestOrg();

  beforeEach(() => {
    mockOrgRepo = {
      findAll: vi.fn(),
      findById: vi.fn(),
      findByIdWithStats: vi.fn(),
      findBySlug: vi.fn().mockResolvedValue(testOrg),
      isSlugTaken: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    mockProjectRepo = {
      create: vi.fn(),
      findById: vi.fn(),
      findBySlug: vi.fn(),
      findByOrganizationId: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      isSlugTaken: vi.fn(),
    };

    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    } as unknown as IStructuredLogger;

    service = new McpAdminToolHandlerService(
      mockOrgRepo as unknown as IOrganizationRepository,
      mockProjectRepo as unknown as IProjectRepository,
      mockLogger,
    );
  });

  describe('handleCreateProject', () => {
    it('should create project and return created status', async () => {
      const project = createTestProject();
      mockProjectRepo.isSlugTaken.mockResolvedValue(false);
      mockProjectRepo.create.mockResolvedValue(project);

      const result = await service.handleCreateProject({
        organizationSlug: 'test-org',
        name: 'Test Project',
        slug: 'test-project',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe('proj-1');
      expect(data.organizationId).toBe('org-1');
      expect(data.status).toBe('created');
    });

    it('should return error when organization not found', async () => {
      mockOrgRepo.findBySlug.mockResolvedValue(null);

      const result = await service.handleCreateProject({
        organizationSlug: 'nonexistent',
        name: 'Test',
        slug: 'test',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Organization not found');
      expect(mockProjectRepo.create).not.toHaveBeenCalled();
    });

    it('should return error when project slug is already taken', async () => {
      mockProjectRepo.isSlugTaken.mockResolvedValue(true);

      const result = await service.handleCreateProject({
        organizationSlug: 'test-org',
        name: 'Test',
        slug: 'existing-slug',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("'existing-slug' is already taken");
      expect(mockProjectRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('handleGetProject', () => {
    it('should return project details', async () => {
      const project = createTestProject();
      mockProjectRepo.findBySlug.mockResolvedValue(project);

      const result = await service.handleGetProject({
        organizationSlug: 'test-org',
        slug: 'test-project',
      });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.id).toBe('proj-1');
      expect(data.slug).toBe('test-project');
    });

    it('should return error when organization not found', async () => {
      mockOrgRepo.findBySlug.mockResolvedValue(null);

      const result = await service.handleGetProject({
        organizationSlug: 'nonexistent',
        slug: 'test-project',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Organization not found');
    });

    it('should return error when project not found', async () => {
      mockProjectRepo.findBySlug.mockResolvedValue(null);

      const result = await service.handleGetProject({
        organizationSlug: 'test-org',
        slug: 'nonexistent',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Project not found');
    });
  });

  describe('handleListProjects', () => {
    it('should return all projects in organization', async () => {
      const projects = [
        createTestProject({ id: 'proj-1', name: 'Project A', slug: 'project-a' }),
        createTestProject({ id: 'proj-2', name: 'Project B', slug: 'project-b' }),
      ];
      mockProjectRepo.findByOrganizationId.mockResolvedValue(projects);

      const result = await service.handleListProjects({ organizationSlug: 'test-org' });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data).toHaveLength(2);
      expect(data[0].slug).toBe('project-a');
    });

    it('should return error when organization not found', async () => {
      mockOrgRepo.findBySlug.mockResolvedValue(null);

      const result = await service.handleListProjects({ organizationSlug: 'nonexistent' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Organization not found');
    });

    it('should return empty array when no projects exist', async () => {
      mockProjectRepo.findByOrganizationId.mockResolvedValue([]);

      const result = await service.handleListProjects({ organizationSlug: 'test-org' });

      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data).toEqual([]);
    });
  });
});
