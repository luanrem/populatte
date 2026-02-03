import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { MappingRepository } from '../../repositories/mapping.repository';
import { ProjectRepository } from '../../repositories/project.repository';

export interface DeleteMappingInput {
  projectId: string;
  mappingId: string;
  userId: string;
}

@Injectable()
export class DeleteMappingUseCase {
  private readonly logger = new Logger(DeleteMappingUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly mappingRepository: MappingRepository,
  ) {}

  public async execute(input: DeleteMappingInput): Promise<void> {
    // Step 1: Find project WITHOUT userId filter (enables separate 404/403)
    const project = await this.projectRepository.findByIdOnly(input.projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Step 2: Check if soft-deleted
    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    // Step 3: Validate ownership (403 with security audit log)
    if (project.userId !== input.userId) {
      this.logger.warn(
        `Unauthorized mapping delete attempt - userId: ${input.userId}, projectId: ${input.projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Find mapping by ID (including soft-deleted for proper 404)
    const mapping = await this.mappingRepository.findByIdWithDeleted(
      input.mappingId,
    );

    if (!mapping) {
      throw new NotFoundException('Mapping not found');
    }

    // Step 5: Check if already deleted
    if (mapping.deletedAt) {
      throw new NotFoundException('Mapping is already deleted');
    }

    // Step 6: Defense-in-depth - verify mapping belongs to the project
    if (mapping.projectId !== input.projectId) {
      this.logger.warn(
        `Cross-project mapping delete attempt - userId: ${input.userId}, projectId: ${input.projectId}, mappingId: ${input.mappingId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 7: Soft delete mapping
    await this.mappingRepository.softDelete(input.mappingId);
  }
}
