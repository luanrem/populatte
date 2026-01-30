import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

import type { Row } from '../../entities/row.entity';
import { ProjectRepository } from '../../repositories/project.repository';
import { BatchRepository } from '../../repositories/batch.repository';
import { RowRepository } from '../../repositories/row.repository';

export interface ListRowsResult {
  items: Row[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class ListRowsUseCase {
  private readonly logger = new Logger(ListRowsUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
  ) {}

  public async execute(
    projectId: string,
    batchId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<ListRowsResult> {
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
        `Unauthorized batch rows access attempt - userId: ${userId}, projectId: ${projectId}`,
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

    // Step 6: Get paginated rows (already sorted by sourceRowIndex ASC)
    const result = await this.rowRepository.findByBatchIdPaginated(
      batchId,
      limit,
      offset,
    );

    // Step 7: Return result with limit/offset
    return {
      items: result.items,
      total: result.total,
      limit,
      offset,
    };
  }
}
