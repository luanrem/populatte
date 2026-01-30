import { Injectable } from '@nestjs/common';

import { ProjectRepository } from '../../repositories/project.repository';

@Injectable()
export class DeleteProjectUseCase {
  public constructor(private readonly projectRepository: ProjectRepository) {}

  public async execute(id: string, userId: string): Promise<void> {
    await this.projectRepository.softDelete(id, userId);
  }
}
