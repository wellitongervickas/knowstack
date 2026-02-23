import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { MAX_EXPORT_RANGE_DAYS, MS_PER_DAY } from '@/application/audit/audit.constants';

/**
 * Custom validator to ensure date range doesn't exceed maximum allowed days.
 * Prevents excessive database load and memory usage during exports.
 */
@ValidatorConstraint({ name: 'maxDateRange', async: false })
export class MaxDateRangeConstraint implements ValidatorConstraintInterface {
  validate(_value: string, args: ValidationArguments): boolean {
    const obj = args.object as { from?: string; to?: string };
    if (!obj.from || !obj.to) return true;

    const fromDate = new Date(obj.from);
    const toDate = new Date(obj.to);
    const diffMs = toDate.getTime() - fromDate.getTime();
    const diffDays = diffMs / MS_PER_DAY;

    return diffDays <= MAX_EXPORT_RANGE_DAYS && diffDays >= 0;
  }

  defaultMessage(): string {
    return `Date range must not exceed ${MAX_EXPORT_RANGE_DAYS} days and 'from' must be before 'to'`;
  }
}
