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

export interface CreateStepInput {
  mappingId: string;
  userId: string;
  action: StepAction;
  selector: SelectorEntry;
  selectorFallbacks?: SelectorEntry[];
  sourceFieldKey?: string | null;
  fixedValue?: string | null;
  optional?: boolean;
  clearBefore?: boolean;
  pressEnter?: boolean;
  waitMs?: number | null;
}

@Injectable()
export class CreateStepUseCase {
  private readonly logger = new Logger(CreateStepUseCase.name);

  public constructor(
    private readonly stepRepository: StepRepository,
    private readonly mappingRepository: MappingRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  public async execute(input: CreateStepInput): Promise<Step> {
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

    // Step 2: Find mapping (soft-delete aware via findById)
    const mapping = await this.mappingRepository.findById(input.mappingId);

    if (!mapping) {
      throw new NotFoundException('Mapping not found');
    }

    // Step 3: Check if mapping is soft-deleted
    if (mapping.deletedAt) {
      throw new NotFoundException('Mapping is archived');
    }

    // Step 4: Find project to validate ownership
    const project = await this.projectRepository.findByIdOnly(
      mapping.projectId,
    );

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Step 5: Check if project is soft-deleted
    if (project.deletedAt) {
      throw new NotFoundException('Project is archived');
    }

    // Step 6: Validate ownership (403 with security audit log)
    if (project.userId !== input.userId) {
      this.logger.warn(
        `Unauthorized step create attempt - userId: ${input.userId}, mappingId: ${input.mappingId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 7: Get next step order
    const maxOrder = await this.stepRepository.getMaxStepOrder(input.mappingId);
    const nextOrder = maxOrder + 1;

    // Step 8: Create step
    return this.stepRepository.create({
      mappingId: input.mappingId,
      action: input.action,
      selector: input.selector,
      selectorFallbacks: input.selectorFallbacks,
      sourceFieldKey: input.sourceFieldKey,
      fixedValue: input.fixedValue,
      stepOrder: nextOrder,
      optional: input.optional,
      clearBefore: input.clearBefore,
      pressEnter: input.pressEnter,
      waitMs: input.waitMs,
    });
  }
}
