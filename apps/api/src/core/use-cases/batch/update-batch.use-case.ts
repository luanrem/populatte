import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { Batch, UpdateBatchData } from '../../entities/batch.entity';
import { BatchRepository } from '../../repositories/batch.repository';
import { ProjectRepository } from '../../repositories/project.repository';

@Injectable()
export class UpdateBatchUseCase {
  private readonly logger = new Logger(UpdateBatchUseCase.name);

  public constructor(
    private readonly batchRepository: BatchRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  public async execute(
    projectId: string,
    batchId: string,
    userId: string,
    data: UpdateBatchData,
  ): Promise<Batch> {
    // 1. Verify project ownership (defense-in-depth)
    const project = await this.projectRepository.findByIdOnly(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.userId !== userId) {
      this.logger.warn(
        `User ${userId} attempted to access project ${projectId} owned by ${project.userId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // 2. Get batch and verify it belongs to project
    const batch = await this.batchRepository.findById(batchId);
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }
    if (batch.projectId !== projectId) {
      throw new NotFoundException('Batch not found');
    }

    // 3. Validate identifier keys exist in columnMetadata
    if (data.identifierFieldKey !== undefined && data.identifierFieldKey !== null) {
      const validKeys = batch.columnMetadata.map((c) => c.normalizedKey);
      if (!validKeys.includes(data.identifierFieldKey)) {
        throw new BadRequestException(
          `Identifier field key '${data.identifierFieldKey}' not found in batch columns`,
        );
      }
    }
    if (data.secondaryFieldKey !== undefined && data.secondaryFieldKey !== null) {
      const validKeys = batch.columnMetadata.map((c) => c.normalizedKey);
      if (!validKeys.includes(data.secondaryFieldKey)) {
        throw new BadRequestException(
          `Secondary field key '${data.secondaryFieldKey}' not found in batch columns`,
        );
      }
    }

    // 4. Update batch
    const updated = await this.batchRepository.update(batchId, data);
    if (!updated) {
      throw new NotFoundException('Batch not found');
    }

    return updated;
  }
}
