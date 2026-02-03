import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { MappingRepository } from '../../repositories/mapping.repository';
import { ProjectRepository } from '../../repositories/project.repository';
import { StepRepository } from '../../repositories/step.repository';

export interface DeleteStepInput {
  stepId: string;
  mappingId: string;
  userId: string;
}

@Injectable()
export class DeleteStepUseCase {
  private readonly logger = new Logger(DeleteStepUseCase.name);

  public constructor(
    private readonly stepRepository: StepRepository,
    private readonly mappingRepository: MappingRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  public async execute(input: DeleteStepInput): Promise<void> {
    // Step 1: Find step
    const step = await this.stepRepository.findById(input.stepId);

    if (!step) {
      throw new NotFoundException('Step not found');
    }

    // Step 2: Defense-in-depth - verify step belongs to mapping
    if (step.mappingId !== input.mappingId) {
      this.logger.warn(
        `Cross-mapping step delete attempt - userId: ${input.userId}, mappingId: ${input.mappingId}, stepId: ${input.stepId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 3: Find mapping (soft-delete aware via findById)
    const mapping = await this.mappingRepository.findById(input.mappingId);

    if (!mapping) {
      throw new NotFoundException('Mapping not found');
    }

    // Step 4: Check if mapping is soft-deleted
    if (mapping.deletedAt) {
      throw new NotFoundException('Mapping is archived');
    }

    // Step 5: Find project to validate ownership
    const project = await this.projectRepository.findByIdOnly(
      mapping.projectId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Step 6: Check if project is soft-deleted
    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    // Step 7: Validate ownership (403 with security audit log)
    if (project.userId !== input.userId) {
      this.logger.warn(
        `Unauthorized step delete attempt - userId: ${input.userId}, mappingId: ${input.mappingId}, stepId: ${input.stepId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 8: Hard delete step
    await this.stepRepository.delete(input.stepId);
  }
}
