import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { Mapping } from '../../entities/mapping.entity';
import type { Step } from '../../entities/step.entity';
import { MappingRepository } from '../../repositories/mapping.repository';
import { ProjectRepository } from '../../repositories/project.repository';
import { StepRepository } from '../../repositories/step.repository';

export interface MappingWithSteps extends Mapping {
  steps: Step[];
}

@Injectable()
export class GetMappingUseCase {
  private readonly logger = new Logger(GetMappingUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly mappingRepository: MappingRepository,
    private readonly stepRepository: StepRepository,
  ) {}

  public async execute(
    projectId: string,
    mappingId: string,
    userId: string,
  ): Promise<MappingWithSteps> {
    // Step 1: Find project WITHOUT userId filter (enables separate 404/403)
    const project = await this.projectRepository.findByIdOnly(projectId);

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Step 2: Check if soft-deleted
    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    // Step 3: Validate ownership (403 with security audit log)
    if (project.userId !== userId) {
      this.logger.warn(
        `Unauthorized mapping access attempt - userId: ${userId}, projectId: ${projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Find mapping by ID (soft-delete aware)
    const mapping = await this.mappingRepository.findById(mappingId);

    if (!mapping) {
      throw new NotFoundException('Mapping not found');
    }

    // Step 5: Defense-in-depth - verify mapping belongs to the project
    if (mapping.projectId !== projectId) {
      this.logger.warn(
        `Cross-project mapping access attempt - userId: ${userId}, projectId: ${projectId}, mappingId: ${mappingId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 6: Fetch steps (already ordered by stepOrder)
    const steps = await this.stepRepository.findByMappingId(mappingId);

    return {
      ...mapping,
      steps,
    };
  }
}
