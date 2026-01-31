import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import type { FieldValuesResult } from '../../entities/field-values.entity';
import { ProjectRepository } from '../../repositories/project.repository';
import { BatchRepository } from '../../repositories/batch.repository';

@Injectable()
export class GetFieldValuesUseCase {
  private readonly logger = new Logger(GetFieldValuesUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly batchRepository: BatchRepository,
  ) {}

  public async execute(
    projectId: string,
    batchId: string,
    fieldKey: string,
    userId: string,
    limit: number,
    offset: number,
    search?: string,
  ): Promise<FieldValuesResult> {
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
        `Unauthorized batch access attempt - userId: ${userId}, projectId: ${projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Find batch
    const batch = await this.batchRepository.findById(batchId);

    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    // Step 5: Defense-in-depth - verify batch belongs to project
    if (batch.projectId !== projectId) {
      throw new NotFoundException('Batch not found');
    }

    // Step 6: Check if field key exists in batch columnMetadata
    const fieldExists = batch.columnMetadata.some(
      (col) => col.normalizedKey === fieldKey,
    );

    if (!fieldExists) {
      throw new NotFoundException('Field not found in batch');
    }

    // Step 7: Delegate to repository
    return this.batchRepository.getFieldValues({
      batchId,
      fieldKey,
      limit,
      offset,
      search,
    });
  }
}
