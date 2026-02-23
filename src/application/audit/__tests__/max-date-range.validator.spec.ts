import { describe, it, expect } from 'vitest';
import { MaxDateRangeConstraint } from '@/application/audit/validators/max-date-range.validator';
import type { ValidationArguments } from 'class-validator';

describe('MaxDateRangeConstraint', () => {
  const validator = new MaxDateRangeConstraint();

  const createArgs = (obj: Record<string, unknown>): ValidationArguments =>
    ({ object: obj }) as ValidationArguments;

  it('should return true when range is within 90 days', () => {
    const obj = {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-03-01T00:00:00.000Z', // 59 days
    };

    expect(validator.validate(obj.to, createArgs(obj))).toBe(true);
  });

  it('should return true when range is exactly 90 days', () => {
    const obj = {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-04-01T00:00:00.000Z', // 90 days
    };

    expect(validator.validate(obj.to, createArgs(obj))).toBe(true);
  });

  it('should return true when from or to is missing', () => {
    expect(validator.validate('2026-01-31', createArgs({}))).toBe(true);
    expect(validator.validate('2026-01-31', createArgs({ from: '2026-01-01' }))).toBe(true);
    expect(validator.validate('2026-01-31', createArgs({ to: '2026-01-31' }))).toBe(true);
  });

  it('should return false when range exceeds 90 days', () => {
    const obj = {
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-06-01T00:00:00.000Z', // 151 days
    };

    expect(validator.validate(obj.to, createArgs(obj))).toBe(false);
  });

  it('should return false when from is after to', () => {
    const obj = {
      from: '2026-03-01T00:00:00.000Z',
      to: '2026-01-01T00:00:00.000Z',
    };

    expect(validator.validate(obj.to, createArgs(obj))).toBe(false);
  });

  it('should return correct default message', () => {
    expect(validator.defaultMessage()).toContain('90 days');
    expect(validator.defaultMessage()).toContain('from');
    expect(validator.defaultMessage()).toContain('to');
  });
});
