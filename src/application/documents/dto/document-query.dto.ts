import { IsOptional, IsIn, IsInt, Min, Max, IsString, MinLength, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import type { SourceType } from '@/core/entities/document.entity';
import { DOCUMENT_DEFAULTS } from '@/application/documents/documents.constants';

export class DocumentListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DOCUMENT_DEFAULTS.LIST_MAX_PAGE_SIZE)
  limit?: number = DOCUMENT_DEFAULTS.LIST_PAGE_SIZE;

  @IsOptional()
  @IsIn(['MANUAL', 'URL'], { message: 'sourceType must be one of: MANUAL, URL' })
  sourceType?: SourceType;

  @IsOptional()
  @IsString()
  projectId?: string;
}

export class DocumentSearchQueryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(DOCUMENT_DEFAULTS.SEARCH_QUERY_MAX_LENGTH)
  q!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(DOCUMENT_DEFAULTS.SEARCH_MAX_LIMIT)
  limit?: number = DOCUMENT_DEFAULTS.SEARCH_DEFAULT_LIMIT;

  @IsOptional()
  @IsString()
  projectId?: string;
}
