import { Injectable } from '@nestjs/common';

import { Project } from '../../entities/project.entity';
import { ProjectRepository } from '../../repositories/project.repository';

export interface CreateProjectInput {
  userId: string;
  name: string;
  description?: string | null;
  targetEntity?: string | null;
  targetUrl?: string | null;
}

@Injectable()
export class CreateProjectUseCase {
  public constructor(private readonly projectRepository: ProjectRepository) {}

  public async execute(input: CreateProjectInput): Promise<Project> {
    return this.projectRepository.create({
      userId: input.userId,
      name: input.name,
      description: input.description ?? null,
      targetEntity: input.targetEntity ?? null,
      targetUrl: input.targetUrl ?? null,
    });
  }
}
