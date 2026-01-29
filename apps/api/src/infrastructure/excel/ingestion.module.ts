import { Module } from '@nestjs/common';

import { CreateBatchUseCase } from '../../core/use-cases/batch';
import { ExcelModule } from './excel.module';
import { IngestionService } from './ingestion.service';

/**
 * Ingestion module
 * Wires Excel parsing strategies with ingestion orchestration service
 *
 * Imports:
 * - ExcelModule: Provides LIST_MODE_STRATEGY and PROFILE_MODE_STRATEGY tokens
 *
 * Provides:
 * - IngestionService: Orchestrates parse-then-persist flow for batch creation
 * - CreateBatchUseCase: Validates ownership and orchestrates ingestion within @Transactional boundary
 *
 * Exports:
 * - IngestionService: For injection into use case layer
 * - CreateBatchUseCase: For injection into batch controller (Phase 10)
 *
 * Note: BatchRepository and RowRepository are injected from global DrizzleModule,
 * so no explicit import needed here.
 *
 * @see ExcelModule for strategy providers
 * @see IngestionService for orchestration logic
 * @see CreateBatchUseCase for transactional use case
 */
@Module({
  imports: [ExcelModule],
  providers: [IngestionService, CreateBatchUseCase],
  exports: [IngestionService, CreateBatchUseCase],
})
export class IngestionModule {}
