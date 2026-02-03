import { Module } from '@nestjs/common';

import {
  CreateMappingUseCase,
  DeleteMappingUseCase,
  GetMappingUseCase,
  ListMappingsUseCase,
  UpdateMappingUseCase,
} from '../../core/use-cases/mapping';
import { MappingController } from '../../presentation/controllers/mapping.controller';

@Module({
  controllers: [MappingController],
  providers: [
    CreateMappingUseCase,
    DeleteMappingUseCase,
    GetMappingUseCase,
    ListMappingsUseCase,
    UpdateMappingUseCase,
  ],
})
export class MappingModule {}
