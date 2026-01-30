import { Module } from '@nestjs/common';

import {
  CreateProjectUseCase,
  ListProjectsUseCase,
  GetProjectUseCase,
  UpdateProjectUseCase,
  DeleteProjectUseCase,
} from '../../core/use-cases/project';
import { ProjectController } from '../../presentation/controllers/project.controller';

@Module({
  controllers: [ProjectController],
  providers: [
    CreateProjectUseCase,
    ListProjectsUseCase,
    GetProjectUseCase,
    UpdateProjectUseCase,
    DeleteProjectUseCase,
  ],
})
export class ProjectModule {}
