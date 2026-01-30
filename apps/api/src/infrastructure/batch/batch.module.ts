import { Module } from '@nestjs/common';

import { BatchController } from '../../presentation/controllers/batch.controller';
import { IngestionModule } from '../excel/ingestion.module';

@Module({
  imports: [IngestionModule],
  controllers: [BatchController],
})
export class BatchModule {}
