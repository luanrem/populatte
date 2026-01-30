import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';

import { BatchController } from '../../presentation/controllers/batch.controller';
import {
  GetBatchUseCase,
  ListBatchesUseCase,
  ListRowsUseCase,
} from '../../core/use-cases/batch';
import { IngestionModule } from '../excel/ingestion.module';
import { ContentLengthMiddleware } from '../upload/middleware/content-length.middleware';

@Module({
  imports: [IngestionModule],
  controllers: [BatchController],
  providers: [GetBatchUseCase, ListBatchesUseCase, ListRowsUseCase],
})
export class BatchModule implements NestModule {
  public configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ContentLengthMiddleware).forRoutes({
      path: 'projects/:projectId/batches',
      method: RequestMethod.POST,
    });
  }
}
