import { IsString, IsOptional, IsObject, MinLength, MaxLength } from 'class-validator';
import { INSTRUCTION_DEFAULTS } from '@/application/instructions/instructions.constants';

export class UpdateInstructionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(INSTRUCTION_DEFAULTS.NAME_MAX_LENGTH)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(INSTRUCTION_DEFAULTS.DESCRIPTION_MAX_LENGTH)
  description?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  content?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
