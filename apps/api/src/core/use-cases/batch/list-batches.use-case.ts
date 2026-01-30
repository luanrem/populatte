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

export interface BatchWithTotalRows extends Batch {
  totalRows: number;
}

export interface ListBatchesResult {
  items: BatchWithTotalRows[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable()
export class ListBatchesUseCase {
  private readonly logger = new Logger(ListBatchesUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
  ) {}

  public async execute(
    projectId: string,
    userId: string,
    limit: number,
    offset: number,
  ): Promise<ListBatchesResult> {
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
        `Unauthorized batch list attempt - userId: ${userId}, projectId: ${projectId}`,
      );
      throw new ForbiddenException('Access denied');
    }

    // Step 4: Get paginated batches
    const result = await this.batchRepository.findByProjectIdPaginated(
      projectId,
      limit,
      offset,
    );

    // Step 5: For each batch, count rows (parallelized with Promise.all)
    const batchesWithTotalRows = await Promise.all(
      result.items.map(async (batch) => {
        const totalRows = await this.rowRepository.countByBatchId(batch.id);
        return {
          ...batch,
          totalRows,
        };
      }),
    );

    // Step 6: Return result with limit/offset
    return {
      items: batchesWithTotalRows,
      total: result.total,
      limit,
      offset,
    };
  }
}
