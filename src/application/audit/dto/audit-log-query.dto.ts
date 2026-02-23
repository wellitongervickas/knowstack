import {
  IsOptional,
  IsUUID,
  IsEnum,
  IsString,
  MaxLength,
  IsISO8601,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AuditCategory,
  AuditAction,
  MAX_LIMIT,
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
} from '@/application/audit/audit.constants';
import { MaxDateRangeConstraint } from '@/application/audit/validators/max-date-range.validator';

/**
 * Query DTO for audit log admin endpoint.
 * All parameters are optional with validation.
 */
export class AuditLogQueryDto {
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsEnum(AuditCategory)
  category?: AuditCategory;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  resourceType?: string;

  @IsOptional()
  @IsUUID()
  resourceId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;
}

/**
 * Query DTO for user self-access audit log endpoint.
 * Simplified query options for user self-access.
 */
export class UserAuditLogQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = DEFAULT_PAGE;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number = DEFAULT_LIMIT;
}

/**
 * Query DTO for audit log export endpoint.
 * Requires date range (max 90 days) to prevent excessive database load.
 */
export class AuditLogExportQueryDto {
  @IsOptional()
  @IsEnum(AuditCategory)
  category?: AuditCategory;

  @IsNotEmpty({ message: 'Export requires a "from" date' })
  @IsISO8601()
  from!: string;

  @IsNotEmpty({ message: 'Export requires a "to" date' })
  @IsISO8601()
  @Validate(MaxDateRangeConstraint)
  to!: string;
}
