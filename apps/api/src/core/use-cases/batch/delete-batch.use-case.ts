import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { BatchRepository } from '../../repositories/batch.repository';
import { ProjectRepository } from '../../repositories/project.repository';

@Injectable()
export class DeleteBatchUseCase {
  private readonly logger = new Logger(DeleteBatchUseCase.name);

  public constructor(
    private readonly batchRepository: BatchRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  public async execute(
    projectId: string,
    batchId: string,
    userId: string,
  ): Promise<void> {
    // 1. Verify project ownership
    const project = await this.projectRepository.findByIdOnly(projectId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.userId !== userId) {
      this.logger.warn(
        `User ${userId} attempted to delete batch in project ${projectId} owned by ${project.userId}`,
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

    // 3. Soft-delete rows first (cascade)
    await this.batchRepository.softDeleteRowsByBatchId(batchId, userId);

    // 4. Soft-delete batch
    await this.batchRepository.softDelete(batchId, userId);
  }
}
