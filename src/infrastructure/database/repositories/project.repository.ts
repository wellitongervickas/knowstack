import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import { IProjectRepository } from '@/core/interfaces/repositories/project.repository.interface';
import { Project } from '@/core/entities/project.entity';

@Injectable()
export class ProjectRepository implements IProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { organizationId: string; name: string; slug: string }): Promise<Project> {
    return this.prisma.project.create({
      data: {
        organizationId: data.organizationId,
        name: data.name,
        slug: data.slug,
      },
    });
  }

  async findById(id: string): Promise<Project | null> {
    return this.prisma.project.findUnique({ where: { id } });
  }

  async findBySlug(organizationId: string, slug: string): Promise<Project | null> {
    return this.prisma.project.findUnique({
      where: {
        organizationId_slug: { organizationId, slug },
      },
    });
  }

  async findByOrganizationId(organizationId: string): Promise<Project[]> {
    return this.prisma.project.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, data: { name?: string; slug?: string }): Promise<Project> {
    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.project.delete({ where: { id } });
  }

  async isSlugTaken(organizationId: string, slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.prisma.project.findFirst({
      where: {
        organizationId,
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });
    return existing !== null;
  }
}
