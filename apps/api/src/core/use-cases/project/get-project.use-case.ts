import { Injectable, NotFoundException } from '@nestjs/common';

import { Project } from '../../entities/project.entity';
import { ProjectRepository } from '../../repositories/project.repository';

@Injectable()
export class GetProjectUseCase {
  public constructor(private readonly projectRepository: ProjectRepository) {}

  public async execute(id: string, userId: string): Promise<Project> {
    const project = await this.projectRepository.findById(id, userId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
