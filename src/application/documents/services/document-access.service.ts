import { Injectable, Inject } from '@nestjs/common';
import { DocumentNotFoundException } from '@/core/exceptions/document.exception';
import type { Document } from '@/core/entities/document.entity';
import {
  IDocumentRepository,
  DOCUMENT_REPOSITORY,
} from '@/core/interfaces/repositories/document.repository.interface';
import { PaginatedDocumentListResponseDto } from '@/application/documents/dto/document-list-response.dto';
import { DocumentSearchResponseDto } from '@/application/documents/dto/document-search-response.dto';
import { DocumentDetailResponseDto } from '@/application/documents/dto/document-detail-response.dto';
import {
  DocumentListQueryDto,
  DocumentSearchQueryDto,
} from '@/application/documents/dto/document-query.dto';
import { DocumentAccessMapper } from '@/application/documents/mappers/document-access.mapper';
import { DOCUMENT_DEFAULTS } from '@/application/documents/documents.constants';

@Injectable()
export class DocumentAccessService {
  constructor(
    @Inject(DOCUMENT_REPOSITORY)
    private readonly documentRepository: IDocumentRepository,
  ) {}

  async listDocuments(
    projectId: string,
    query: DocumentListQueryDto,
    contextProjectIds?: string[],
  ): Promise<PaginatedDocumentListResponseDto> {
    const projectIds = [projectId, ...(contextProjectIds ?? [])];
    const allDocuments = (
      await Promise.all(projectIds.map((pid) => this.documentRepository.findByProjectId(pid)))
    ).flat();

    // Filter by sourceType in memory (if provided)
    let filtered = allDocuments;
    if (query.sourceType) {
      filtered = allDocuments.filter((doc) => doc.sourceType === query.sourceType);
    }

    // Sort by createdAt descending
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // In-memory pagination
    const page = query.page ?? 1;
    const limit = query.limit ?? DOCUMENT_DEFAULTS.LIST_PAGE_SIZE;

    // Defensive check: ensure limit is positive to avoid division by zero
    // (DTO validation already enforces @Min(1), but protect against programmatic calls)
    if (limit <= 0) {
      throw new Error('Pagination limit must be greater than 0');
    }

    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      data: paginated.map(DocumentAccessMapper.toListItem),
      pagination: { total, page, limit, totalPages },
    };
  }

  async searchDocuments(
    projectId: string,
    query: DocumentSearchQueryDto,
    contextProjectIds?: string[],
  ): Promise<DocumentSearchResponseDto> {
    const limit = query.limit ?? DOCUMENT_DEFAULTS.SEARCH_DEFAULT_LIMIT;
    const projectIds = [projectId, ...(contextProjectIds ?? [])];
    const allowedProjectIds = new Set(projectIds);

    // Keyword search across all projects
    const allSearchResults = (
      await Promise.all(
        projectIds.map((pid) => this.documentRepository.search(pid, query.q, limit)),
      )
    ).flat();

    // Hydrate full documents
    const documentIds = allSearchResults.map((r) => r.id);
    const documents = await this.documentRepository.findByIds(documentIds);

    // POST-FETCH TENANT VERIFICATION
    const verifiedDocuments = documents.filter((doc) => allowedProjectIds.has(doc.projectId));
    const docMap = new Map(verifiedDocuments.map((doc) => [doc.id, doc]));

    // Merge scores, sort by score descending, limit
    const results = allSearchResults
      .map((result) => {
        const doc = docMap.get(result.id);
        if (!doc) return null;
        return DocumentAccessMapper.toSearchResult(doc, result.score);
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { results, total: results.length, query: query.q };
  }

  async getDocument(projectId: string, documentId: string): Promise<DocumentDetailResponseDto> {
    const document = await this.documentRepository.findById(documentId);

    // Tenant isolation: 404 for not found OR cross-project access
    if (!document || document.projectId !== projectId) {
      throw new DocumentNotFoundException(documentId);
    }

    return DocumentAccessMapper.toDetailResponse(document);
  }

  /**
   * Get all documents for a project (and optional context projects).
   * Used by the query pipeline for context retrieval.
   */
  async getDocumentsForProject(
    projectId: string,
    contextProjectIds?: string[],
  ): Promise<Document[]> {
    const projectIds = [projectId, ...(contextProjectIds ?? [])];
    return (
      await Promise.all(projectIds.map((pid) => this.documentRepository.findByProjectId(pid)))
    ).flat();
  }
}
