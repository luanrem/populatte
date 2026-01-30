import { Injectable, NotFoundException } from '@nestjs/common';

import { Project, UpdateProjectData } from '../../entities/project.entity';
import { ProjectRepository } from '../../repositories/project.repository';

@Injectable()
export class UpdateProjectUseCase {
  public constructor(private readonly projectRepository: ProjectRepository) {}

  public async execute(
    id: string,
    userId: string,
    data: UpdateProjectData,
  ): Promise<Project> {
    const project = await this.projectRepository.update(id, userId, data);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
