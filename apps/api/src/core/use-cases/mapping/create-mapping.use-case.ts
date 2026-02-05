import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type {
  Mapping,
  SuccessConfig,
  SuccessTrigger,
} from '../../entities/mapping.entity';
import type { SelectorEntry, Step, StepAction } from '../../entities/step.entity';
import { MappingRepository } from '../../repositories/mapping.repository';
import { ProjectRepository } from '../../repositories/project.repository';
import { StepRepository } from '../../repositories/step.repository';

import type { MappingWithSteps } from './get-mapping.use-case';

/**
 * Inline step input for creating steps with the mapping
 */
export interface InlineStepInput {
  action: StepAction;
  selector: SelectorEntry;
  selectorFallbacks?: SelectorEntry[];
  sourceFieldKey?: string | null;
  fixedValue?: string | null;
  optional?: boolean;
  clearBefore?: boolean;
  pressEnter?: boolean;
  waitMs?: number | null;
  stepOrder?: number;
}

export interface CreateMappingInput {
  projectId: string;
  userId: string;
  name: string;
  targetUrl: string;
  successTrigger?: SuccessTrigger | null;
  successConfig?: SuccessConfig | null;
  isActive?: boolean;
  steps?: InlineStepInput[];
}

@Injectable()
export class CreateMappingUseCase {
  private readonly logger = new Logger(CreateMappingUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly mappingRepository: MappingRepository,
    private readonly stepRepository: StepRepository,
  ) {}

  public async execute(
    input: CreateMappingInput,
  ): Promise<Mapping | MappingWithSteps> {
    this.logger.log(
      `Creating mapping for project ${input.projectId} with ${input.steps?.length ?? 0} steps`,
    );

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
        `Unauthorized mapping create attempt - userId: ${input.userId}, projectId: ${input.projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Create mapping
    const mapping = await this.mappingRepository.create({
      projectId: input.projectId,
      name: input.name,
      targetUrl: input.targetUrl,
      successTrigger: input.successTrigger,
      successConfig: input.successConfig,
    });

    this.logger.log(`Mapping created: ${mapping.id}`);

    // Step 5: Create steps if provided
    if (input.steps && input.steps.length > 0) {
      this.logger.log(`Creating ${input.steps.length} steps for mapping ${mapping.id}`);

      const createdSteps: Step[] = [];

      for (let i = 0; i < input.steps.length; i++) {
        const stepInput = input.steps[i];
        if (!stepInput) continue;

        const step = await this.stepRepository.create({
          mappingId: mapping.id,
          action: stepInput.action,
          selector: stepInput.selector,
          stepOrder: stepInput.stepOrder ?? i + 1,
          selectorFallbacks: stepInput.selectorFallbacks,
          sourceFieldKey: stepInput.sourceFieldKey,
          fixedValue: stepInput.fixedValue,
          optional: stepInput.optional,
          clearBefore: stepInput.clearBefore,
          pressEnter: stepInput.pressEnter,
          waitMs: stepInput.waitMs,
        });

        createdSteps.push(step);
        this.logger.log(`Step ${i + 1} created: ${step.id}`);
      }

      // Return mapping with steps
      return {
        ...mapping,
        steps: createdSteps,
      };
    }

    // No steps - return plain mapping
    return mapping;
  }
}
