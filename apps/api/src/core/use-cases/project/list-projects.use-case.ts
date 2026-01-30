import { Injectable } from '@nestjs/common';

import { ProjectSummary } from '../../entities/project.entity';
import { ProjectRepository } from '../../repositories/project.repository';

@Injectable()
export class ListProjectsUseCase {
  public constructor(private readonly projectRepository: ProjectRepository) {}

  public async execute(userId: string): Promise<ProjectSummary[]> {
    return this.projectRepository.findAllSummariesByUserId(userId);
  }
}
