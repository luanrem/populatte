import { Injectable } from '@nestjs/common';

import { Project } from '../../entities/project.entity';
import { ProjectRepository } from '../../repositories/project.repository';

@Injectable()
export class ListProjectsUseCase {
  public constructor(private readonly projectRepository: ProjectRepository) {}

  public async execute(userId: string): Promise<Project[]> {
    return this.projectRepository.findAllByUserId(userId);
  }
}
