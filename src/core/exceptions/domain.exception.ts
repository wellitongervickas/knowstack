/**
 * Base domain exception.
 * All domain-specific exceptions should extend this class.
 */
export class DomainException extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'DomainException';
  }
}
