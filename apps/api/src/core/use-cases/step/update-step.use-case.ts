import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type {
  SelectorEntry,
  Step,
  StepAction,
} from '../../entities/step.entity';
import { MappingRepository } from '../../repositories/mapping.repository';
import { ProjectRepository } from '../../repositories/project.repository';
import { StepRepository } from '../../repositories/step.repository';

export interface UpdateStepInput {
  stepId: string;
  mappingId: string;
  userId: string;
  action?: StepAction;
  selector?: SelectorEntry;
  selectorFallbacks?: SelectorEntry[];
  sourceFieldKey?: string | null;
  fixedValue?: string | null;
  optional?: boolean;
  clearBefore?: boolean;
  pressEnter?: boolean;
  waitMs?: number | null;
}

@Injectable()
export class UpdateStepUseCase {
  private readonly logger = new Logger(UpdateStepUseCase.name);

  public constructor(
    private readonly stepRepository: StepRepository,
    private readonly mappingRepository: MappingRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  public async execute(input: UpdateStepInput): Promise<Step> {
    // Step 1: Validate sourceFieldKey/fixedValue mutual exclusion
    if (
      input.sourceFieldKey !== undefined &&
      input.sourceFieldKey !== null &&
      input.fixedValue !== undefined &&
      input.fixedValue !== null
    ) {
      throw new BadRequestException(
        'Cannot provide both sourceFieldKey and fixedValue',
      );
    }

    // Step 2: Find step
    const step = await this.stepRepository.findById(input.stepId);

    if (!step) {
      throw new NotFoundException('Step not found');
    }

    // Step 3: Defense-in-depth - verify step belongs to mapping
    if (step.mappingId !== input.mappingId) {
      this.logger.warn(
        `Cross-mapping step update attempt - userId: ${input.userId}, mappingId: ${input.mappingId}, stepId: ${input.stepId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Find mapping (soft-delete aware via findById)
    const mapping = await this.mappingRepository.findById(input.mappingId);

    if (!mapping) {
      throw new NotFoundException('Mapping not found');
    }

    // Step 5: Check if mapping is soft-deleted
    if (mapping.deletedAt) {
      throw new NotFoundException('Mapping is archived');
    }

    // Step 6: Find project to validate ownership
    const project = await this.projectRepository.findByIdOnly(
      mapping.projectId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Step 7: Check if project is soft-deleted
    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    // Step 8: Validate ownership (403 with security audit log)
    if (project.userId !== input.userId) {
      this.logger.warn(
        `Unauthorized step update attempt - userId: ${input.userId}, mappingId: ${input.mappingId}, stepId: ${input.stepId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 9: Update step
    const updated = await this.stepRepository.update(input.stepId, {
      action: input.action,
      selector: input.selector,
      selectorFallbacks: input.selectorFallbacks,
      sourceFieldKey: input.sourceFieldKey,
      fixedValue: input.fixedValue,
      optional: input.optional,
      clearBefore: input.clearBefore,
      pressEnter: input.pressEnter,
      waitMs: input.waitMs,
    });

    if (!updated) {
      throw new NotFoundException('Step not found');
    }

    return updated;
  }
}
