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

export interface UpdateMappingInput {
  projectId: string;
  mappingId: string;
  userId: string;
  name?: string;
  targetUrl?: string;
  isActive?: boolean;
  successTrigger?: SuccessTrigger | null;
  successConfig?: SuccessConfig | null;
}

@Injectable()
export class UpdateMappingUseCase {
  private readonly logger = new Logger(UpdateMappingUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly mappingRepository: MappingRepository,
  ) {}

  public async execute(input: UpdateMappingInput): Promise<Mapping> {
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
        `Unauthorized mapping update attempt - userId: ${input.userId}, projectId: ${input.projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Find mapping by ID (soft-delete aware)
    const mapping = await this.mappingRepository.findById(input.mappingId);

    if (!mapping) {
      throw new NotFoundException('Mapping not found');
    }

    // Step 5: Defense-in-depth - verify mapping belongs to the project
    if (mapping.projectId !== input.projectId) {
      this.logger.warn(
        `Cross-project mapping update attempt - userId: ${input.userId}, projectId: ${input.projectId}, mappingId: ${input.mappingId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 6: Update mapping
    const updated = await this.mappingRepository.update(input.mappingId, {
      name: input.name,
      targetUrl: input.targetUrl,
      isActive: input.isActive,
      successTrigger: input.successTrigger,
      successConfig: input.successConfig,
    });

    if (!updated) {
      throw new NotFoundException('Mapping not found');
    }

    return updated;
  }
}
