import { DomainException } from './domain.exception';

/**
 * Thrown when a document is not found or cross-tenant access is attempted.
 * Uses a static message to prevent leaking document identifiers in API responses.
 */
export class DocumentNotFoundException extends DomainException {
  constructor(_identifier?: string) {
    super('Document not found', 'DOCUMENT_NOT_FOUND');
    this.name = 'DocumentNotFoundException';
  }
}
