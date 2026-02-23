import { Module } from '@nestjs/common';
import { DOCUMENT_REPOSITORY } from '@/core/interfaces/repositories/document.repository.interface';
import { URL_FETCHER } from '@/core/interfaces/services/source-fetcher.interface';
import { DocumentRepository } from '@/infrastructure/database/repositories/document.repository';
import { UrlFetcher } from './fetchers/url-fetcher';
import {
  DocumentIngestionService,
  DOCUMENT_INGESTION_SERVICE,
} from '@/application/ingestion/services/document-ingestion.service';
import {
  CacheInvalidationService,
  CACHE_INVALIDATION_SERVICE,
} from '@/application/cache/services/cache-invalidation.service';
import { EmbeddingModule } from '@/application/embedding/embedding.module';

/**
 * Ingestion Module.
 * Provides document ingestion services for fetching and storing documents
 * from various sources (GitHub, URL).
 * Triggers embedding generation on document create/update.
 */
@Module({
  imports: [EmbeddingModule],
  providers: [
    // Repository
    {
      provide: DOCUMENT_REPOSITORY,
      useClass: DocumentRepository,
    },
    DocumentRepository,

    // Fetchers
    {
      provide: URL_FETCHER,
      useClass: UrlFetcher,
    },
    UrlFetcher,

    // Cache Invalidation
    {
      provide: CACHE_INVALIDATION_SERVICE,
      useClass: CacheInvalidationService,
    },
    CacheInvalidationService,

    // Ingestion Service
    {
      provide: DOCUMENT_INGESTION_SERVICE,
      useClass: DocumentIngestionService,
    },
    DocumentIngestionService,
  ],
  exports: [
    DOCUMENT_REPOSITORY,
    DOCUMENT_INGESTION_SERVICE,
    CACHE_INVALIDATION_SERVICE,
    URL_FETCHER,
    DocumentIngestionService,
    CacheInvalidationService,
    DocumentRepository,
    UrlFetcher,
  ],
})
export class IngestionModule {}
