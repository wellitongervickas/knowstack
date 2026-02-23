import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

/**
 * Query Request DTO.
 * Validates incoming POST /query requests.
 */
export class QueryRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  query!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  context?: string;

  @IsOptional()
  @IsString()
  projectId?: string;
}
