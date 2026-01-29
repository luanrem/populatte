import { Module } from '@nestjs/common';

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
 *
 * Exports:
 * - IngestionService: For injection into use case layer (CreateBatchUseCase)
 *
 * Note: BatchRepository and RowRepository are injected from global DrizzleModule,
 * so no explicit import needed here.
 *
 * @see ExcelModule for strategy providers
 * @see IngestionService for orchestration logic
 * @see CreateBatchUseCase (Phase 5) for consumer
 */
@Module({
  imports: [ExcelModule],
  providers: [IngestionService],
  exports: [IngestionService],
})
export class IngestionModule {}
