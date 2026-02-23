import { IsOptional, IsIn, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import type { InstructionType } from '@/core/entities/instruction.entity';
import {
  INSTRUCTION_TYPES,
  INSTRUCTION_DEFAULTS,
} from '@/application/instructions/instructions.constants';

export class InstructionListQueryDto {
  @IsOptional()
  @IsIn([...INSTRUCTION_TYPES], {
    message: 'type must be one of: AGENT, COMMAND, MEMORY, SKILL, TEMPLATE',
  })
  type?: InstructionType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(INSTRUCTION_DEFAULTS.LIST_MAX_PAGE_SIZE)
  limit?: number = INSTRUCTION_DEFAULTS.LIST_PAGE_SIZE;
}
