import { IsString, IsIn, IsOptional, IsObject, MinLength, MaxLength } from 'class-validator';
import type { InstructionType } from '@/core/entities/instruction.entity';
import {
  INSTRUCTION_TYPES,
  INSTRUCTION_DEFAULTS,
  INSTRUCTION_API_VISIBILITIES,
} from '@/application/instructions/instructions.constants';

export class CreateInstructionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(INSTRUCTION_DEFAULTS.NAME_MAX_LENGTH)
  name!: string;

  @IsIn([...INSTRUCTION_TYPES], {
    message: 'type must be one of: AGENT, COMMAND, MEMORY, SKILL, TEMPLATE',
  })
  type!: InstructionType;

  @IsString()
  @MinLength(1)
  @MaxLength(INSTRUCTION_DEFAULTS.DESCRIPTION_MAX_LENGTH)
  description!: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsIn([...INSTRUCTION_API_VISIBILITIES], {
    message: 'visibility must be one of: ORGANIZATION, PRIVATE',
  })
  visibility?: 'ORGANIZATION' | 'PRIVATE';
}
