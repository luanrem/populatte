import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { Step } from '../../entities/step.entity';
import { MappingRepository } from '../../repositories/mapping.repository';
import { ProjectRepository } from '../../repositories/project.repository';
import { StepRepository } from '../../repositories/step.repository';

export interface ReorderStepsInput {
  mappingId: string;
  userId: string;
  orderedStepIds: string[];
}

@Injectable()
export class ReorderStepsUseCase {
  private readonly logger = new Logger(ReorderStepsUseCase.name);

  public constructor(
    private readonly stepRepository: StepRepository,
    private readonly mappingRepository: MappingRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  public async execute(input: ReorderStepsInput): Promise<Step[]> {
    // Step 1: Find mapping (soft-delete aware via findById)
    const mapping = await this.mappingRepository.findById(input.mappingId);

    if (!mapping) {
      throw new NotFoundException('Mapping not found');
    }

    // Step 2: Check if mapping is soft-deleted
    if (mapping.deletedAt) {
      throw new NotFoundException('Mapping is archived');
    }

    // Step 3: Find project to validate ownership
    const project = await this.projectRepository.findByIdOnly(
      mapping.projectId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Step 4: Check if project is soft-deleted
    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    // Step 5: Validate ownership (403 with security audit log)
    if (project.userId !== input.userId) {
      this.logger.warn(
        `Unauthorized steps reorder attempt - userId: ${input.userId}, mappingId: ${input.mappingId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 6: Get all steps for this mapping
    const existingSteps = await this.stepRepository.findByMappingId(
      input.mappingId,
    );
    const existingStepIds = new Set(existingSteps.map((s) => s.id));

    // Step 7: Validate orderedStepIds length matches
    if (input.orderedStepIds.length !== existingSteps.length) {
      throw new BadRequestException(
        `Expected ${existingSteps.length} step IDs, received ${input.orderedStepIds.length}`,
      );
    }

    // Step 8: Check for duplicates in orderedStepIds
    const orderedSet = new Set(input.orderedStepIds);
    if (orderedSet.size !== input.orderedStepIds.length) {
      throw new BadRequestException('Duplicate step IDs in orderedStepIds');
    }

    // Step 9: Check orderedStepIds contains ALL existing step IDs
    for (const existingId of existingStepIds) {
      if (!orderedSet.has(existingId)) {
        throw new BadRequestException(
          `Missing step ID in orderedStepIds: ${existingId}`,
        );
      }
    }

    // Step 10: Check orderedStepIds contains NO extra IDs
    for (const orderedId of input.orderedStepIds) {
      if (!existingStepIds.has(orderedId)) {
        throw new BadRequestException(
          `Unknown step ID in orderedStepIds: ${orderedId}`,
        );
      }
    }

    // Step 11: Reorder steps
    return this.stepRepository.reorder(input.mappingId, input.orderedStepIds);
  }
}
