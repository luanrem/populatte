import { Injectable, NotFoundException } from '@nestjs/common';

import {
  Project,
  ProjectStatus,
  ProjectUrlInput,
  UpdateProjectData,
  normalizeProjectUrls,
} from '../../entities/project.entity';
import { ProjectRepository } from '../../repositories/project.repository';

export interface UpdateProjectInput {
  name?: string;
  description?: string | null;
  targetEntity?: string | null;
  urls?: ProjectUrlInput[];
  status?: ProjectStatus;
}

@Injectable()
export class UpdateProjectUseCase {
  public constructor(private readonly projectRepository: ProjectRepository) {}

  public async execute(
    id: string,
    userId: string,
    input: UpdateProjectInput,
  ): Promise<Project> {
    const data: UpdateProjectData = {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.targetEntity !== undefined && {
        targetEntity: input.targetEntity,
      }),
      ...(input.urls !== undefined && {
        urls: normalizeProjectUrls(input.urls),
      }),
      ...(input.status !== undefined && { status: input.status }),
    };

    const project = await this.projectRepository.update(id, userId, data);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }
}
