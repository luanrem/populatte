import { Module } from '@nestjs/common';

import {
  CreateStepUseCase,
  DeleteStepUseCase,
  ReorderStepsUseCase,
  UpdateStepUseCase,
} from '../../core/use-cases/step';
import { StepController } from '../../presentation/controllers/step.controller';

@Module({
  controllers: [StepController],
  providers: [
    CreateStepUseCase,
    DeleteStepUseCase,
    ReorderStepsUseCase,
    UpdateStepUseCase,
  ],
})
export class StepModule {}
