import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma/prisma.service';
import {
  IInstructionRepository,
  CreateInstructionInput,
  UpdateInstructionInput,
} from '@/core/interfaces/repositories/instruction.repository.interface';
import { Instruction, InstructionType } from '@/core/entities/instruction.entity';

@Injectable()
export class InstructionRepository implements IInstructionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByProjectId(projectId: string): Promise<Instruction[]> {
    const instructions = await this.prisma.instruction.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return instructions.map(this.mapToEntity);
  }

  async findById(id: string): Promise<Instruction | null> {
    const instruction = await this.prisma.instruction.findUnique({
      where: { id },
    });
    return instruction ? this.mapToEntity(instruction) : null;
  }

  async findPublicByType(type: InstructionType): Promise<Instruction[]> {
    const instructions = await this.prisma.instruction.findMany({
      where: { type, visibility: 'PUBLIC' },
      orderBy: { name: 'asc' },
    });
    return instructions.map(this.mapToEntity);
  }

  async findByProjectIdAndType(projectId: string, type: InstructionType): Promise<Instruction[]> {
    const instructions = await this.prisma.instruction.findMany({
      where: { projectId, type, visibility: 'PRIVATE' },
      orderBy: { name: 'asc' },
    });
    return instructions.map(this.mapToEntity);
  }

  async findByOrganizationIdAndType(
    organizationId: string,
    type: InstructionType,
  ): Promise<Instruction[]> {
    const instructions = await this.prisma.instruction.findMany({
      where: { organizationId, type, visibility: 'ORGANIZATION', projectId: null },
      orderBy: { name: 'asc' },
    });
    return instructions.map(this.mapToEntity);
  }

  async findByNameAndType(
    name: string,
    type: InstructionType,
    projectId: string | null,
  ): Promise<Instruction | null> {
    const instruction = await this.prisma.instruction.findFirst({
      where: { name, type, projectId },
    });
    return instruction ? this.mapToEntity(instruction) : null;
  }

  async findByNameAndTypeForOrganization(
    name: string,
    type: InstructionType,
    organizationId: string,
  ): Promise<Instruction | null> {
    const instruction = await this.prisma.instruction.findFirst({
      where: { name, type, organizationId, projectId: null, visibility: 'ORGANIZATION' },
    });
    return instruction ? this.mapToEntity(instruction) : null;
  }

  async create(input: CreateInstructionInput): Promise<Instruction> {
    const instruction = await this.prisma.instruction.create({
      data: {
        name: input.name,
        type: input.type,
        visibility: input.visibility,
        description: input.description,
        content: input.content,
        metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
        projectId: input.projectId,
        organizationId: input.organizationId,
      },
    });
    return this.mapToEntity(instruction);
  }

  async update(id: string, input: UpdateInstructionInput): Promise<Instruction> {
    const instruction = await this.prisma.instruction.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.metadata !== undefined && {
          metadata: input.metadata as Prisma.InputJsonValue,
        }),
      },
    });
    return this.mapToEntity(instruction);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.instruction.delete({
      where: { id },
    });
  }

  /**
   * Map Prisma instruction to domain entity.
   */
  private mapToEntity(
    doc: Awaited<ReturnType<typeof this.prisma.instruction.findFirst>> & NonNullable<unknown>,
  ): Instruction {
    return {
      id: doc.id,
      name: doc.name,
      type: doc.type as Instruction['type'],
      visibility: doc.visibility as Instruction['visibility'],
      description: doc.description,
      content: doc.content,
      metadata: (doc.metadata as Instruction['metadata']) ?? {},
      projectId: doc.projectId,
      organizationId: doc.organizationId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}
