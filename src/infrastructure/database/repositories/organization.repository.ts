import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import { IOrganizationRepository } from '@/core/interfaces/repositories/organization.repository.interface';
import {
  Organization,
  OrganizationWithStats,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '@/core/entities/organization.entity';

@Injectable()
export class OrganizationRepository implements IOrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Organization | null> {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    return org ? this.mapToOrganization(org) : null;
  }

  async findByIdWithStats(id: string): Promise<OrganizationWithStats | null> {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
    });

    if (!org) return null;

    return {
      ...this.mapToOrganization(org),
      projectCount: org._count.projects,
    };
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const org = await this.prisma.organization.findUnique({ where: { slug } });
    return org ? this.mapToOrganization(org) : null;
  }

  async isSlugTaken(slug: string): Promise<boolean> {
    const count = await this.prisma.organization.count({ where: { slug } });
    return count > 0;
  }

  async findAll(): Promise<Organization[]> {
    const orgs = await this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return orgs.map((org) => this.mapToOrganization(org));
  }

  async create(data: CreateOrganizationInput): Promise<Organization> {
    const org = await this.prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
      },
    });

    return this.mapToOrganization(org);
  }

  async update(id: string, data: UpdateOrganizationInput): Promise<Organization> {
    const org = await this.prisma.organization.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.slug && { slug: data.slug }),
      },
    });

    return this.mapToOrganization(org);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.organization.delete({ where: { id } });
  }

  private mapToOrganization(org: {
    id: string;
    name: string;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
  }): Organization {
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }
}
