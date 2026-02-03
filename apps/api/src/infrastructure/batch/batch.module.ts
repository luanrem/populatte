import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';

import { BatchController } from '../../presentation/controllers/batch.controller';
import {
  GetBatchUseCase,
  GetFieldStatsUseCase,
  GetFieldValuesUseCase,
  ListBatchesUseCase,
  ListRowsUseCase,
} from '../../core/use-cases/batch';
import { UpdateRowStatusUseCase } from '../../core/use-cases/row';
import { TypeInferenceService } from '../../core/services/type-inference.service';
import { IngestionModule } from '../excel/ingestion.module';
import { ContentLengthMiddleware } from '../upload/middleware/content-length.middleware';

@Module({
  imports: [IngestionModule],
  controllers: [BatchController],
  providers: [
    GetBatchUseCase,
    GetFieldStatsUseCase,
    GetFieldValuesUseCase,
    ListBatchesUseCase,
    ListRowsUseCase,
    UpdateRowStatusUseCase,
    TypeInferenceService,
  ],
})
export class BatchModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ContentLengthMiddleware).forRoutes({
      path: 'projects/:projectId/batches',
      method: RequestMethod.POST,
    });
  }
}
