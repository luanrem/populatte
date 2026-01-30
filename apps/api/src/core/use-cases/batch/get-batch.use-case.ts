import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import type { Batch } from '../../entities/batch.entity';
import { ProjectRepository } from '../../repositories/project.repository';
import { BatchRepository } from '../../repositories/batch.repository';
import { RowRepository } from '../../repositories/row.repository';

export interface GetBatchResult extends Batch {
  totalRows: number;
}

@Injectable()
export class GetBatchUseCase {
  private readonly logger = new Logger(GetBatchUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
  ) {}

  public async execute(
    projectId: string,
    batchId: string,
    userId: string,
  ): Promise<GetBatchResult> {
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

    // Step 6: Count rows in batch
    const totalRows = await this.rowRepository.countByBatchId(batchId);

    // Step 7: Return batch with totalRows
    return {
      ...batch,
      totalRows,
    };
  }
}
