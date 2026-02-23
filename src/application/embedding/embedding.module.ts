import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmbeddingInfrastructureModule } from '@/infrastructure/embedding/embedding.module';
import { ObservabilityModule } from '@/infrastructure/observability/observability.module';
import { DOCUMENT_EMBEDDING_REPOSITORY } from '@/core/interfaces/repositories/document-embedding.repository.interface';
import { DOCUMENT_REPOSITORY } from '@/core/interfaces/repositories/document.repository.interface';
import { INSTRUCTION_EMBEDDING_REPOSITORY } from '@/core/interfaces/repositories/instruction-embedding.repository.interface';
import { INSTRUCTION_REPOSITORY } from '@/core/interfaces/repositories/instruction.repository.interface';
import { DocumentEmbeddingRepository } from '@/infrastructure/database/repositories/document-embedding.repository';
import { DocumentRepository } from '@/infrastructure/database/repositories/document.repository';
import { InstructionEmbeddingRepository } from '@/infrastructure/database/repositories/instruction-embedding.repository';
import { InstructionRepository } from '@/infrastructure/database/repositories/instruction.repository';
import {
  DocumentEmbeddingService,
  DOCUMENT_EMBEDDING_SERVICE,
} from '@/application/embedding/services/document-embedding.service';
import {
  SemanticSearchService,
  SEMANTIC_SEARCH_SERVICE,
} from '@/application/embedding/services/semantic-search.service';
import {
  EmbeddingBackfillService,
  EMBEDDING_BACKFILL_SERVICE,
} from '@/application/embedding/services/embedding-backfill.service';
import {
  InstructionEmbeddingService,
  INSTRUCTION_EMBEDDING_SERVICE,
} from '@/application/embedding/services/instruction-embedding.service';
import {
  InstructionSearchService,
  INSTRUCTION_SEARCH_SERVICE,
} from '@/application/embedding/services/instruction-search.service';
import {
  InstructionBackfillService,
  INSTRUCTION_BACKFILL_SERVICE,
} from '@/application/embedding/services/instruction-backfill.service';
import { embeddingConfig } from '@/infrastructure/config/embedding.config';

/**
 * Embedding Application Module.
 *
 * Provides document and instruction embedding and semantic search services.
 * Integrates with infrastructure embedding providers.
 */
@Module({
  imports: [
    ConfigModule.forFeature(embeddingConfig),
    EmbeddingInfrastructureModule,
    ObservabilityModule,
  ],
  providers: [
    // Repositories
    {
      provide: DOCUMENT_EMBEDDING_REPOSITORY,
      useClass: DocumentEmbeddingRepository,
    },
    DocumentEmbeddingRepository,
    {
      provide: DOCUMENT_REPOSITORY,
      useClass: DocumentRepository,
    },
    DocumentRepository,
    {
      provide: INSTRUCTION_EMBEDDING_REPOSITORY,
      useClass: InstructionEmbeddingRepository,
    },
    InstructionEmbeddingRepository,
    {
      provide: INSTRUCTION_REPOSITORY,
      useClass: InstructionRepository,
    },
    InstructionRepository,

    // Document Embedding Service
    {
      provide: DOCUMENT_EMBEDDING_SERVICE,
      useClass: DocumentEmbeddingService,
    },
    DocumentEmbeddingService,

    // Semantic Search Service
    {
      provide: SEMANTIC_SEARCH_SERVICE,
      useClass: SemanticSearchService,
    },
    SemanticSearchService,

    // Backfill Service (Documents)
    {
      provide: EMBEDDING_BACKFILL_SERVICE,
      useClass: EmbeddingBackfillService,
    },
    EmbeddingBackfillService,

    // Instruction Embedding Service
    {
      provide: INSTRUCTION_EMBEDDING_SERVICE,
      useClass: InstructionEmbeddingService,
    },
    InstructionEmbeddingService,

    // Instruction Search Service
    {
      provide: INSTRUCTION_SEARCH_SERVICE,
      useClass: InstructionSearchService,
    },
    InstructionSearchService,

    // Instruction Backfill Service
    {
      provide: INSTRUCTION_BACKFILL_SERVICE,
      useClass: InstructionBackfillService,
    },
    InstructionBackfillService,
  ],
  exports: [
    DOCUMENT_EMBEDDING_SERVICE,
    DOCUMENT_EMBEDDING_REPOSITORY,
    SEMANTIC_SEARCH_SERVICE,
    EMBEDDING_BACKFILL_SERVICE,
    DocumentEmbeddingService,
    DocumentEmbeddingRepository,
    SemanticSearchService,
    EmbeddingBackfillService,
    INSTRUCTION_EMBEDDING_SERVICE,
    INSTRUCTION_EMBEDDING_REPOSITORY,
    INSTRUCTION_SEARCH_SERVICE,
    INSTRUCTION_BACKFILL_SERVICE,
    InstructionEmbeddingService,
    InstructionEmbeddingRepository,
    InstructionSearchService,
    InstructionBackfillService,
  ],
})
export class EmbeddingModule {}
