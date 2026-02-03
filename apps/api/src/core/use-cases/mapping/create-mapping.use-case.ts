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
import { MappingRepository } from '../../repositories/mapping.repository';
import { ProjectRepository } from '../../repositories/project.repository';

export interface CreateMappingInput {
  projectId: string;
  userId: string;
  name: string;
  targetUrl: string;
  successTrigger?: SuccessTrigger | null;
  successConfig?: SuccessConfig | null;
}

@Injectable()
export class CreateMappingUseCase {
  private readonly logger = new Logger(CreateMappingUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly mappingRepository: MappingRepository,
  ) {}

  public async execute(input: CreateMappingInput): Promise<Mapping> {
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
    return this.mappingRepository.create({
      projectId: input.projectId,
      name: input.name,
      targetUrl: input.targetUrl,
      successTrigger: input.successTrigger,
      successConfig: input.successConfig,
    });
  }
}
