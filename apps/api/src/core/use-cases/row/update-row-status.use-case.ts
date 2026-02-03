import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';

import type { Row, UpdateRowStatusData } from '../../entities/row.entity';
import { FillStatus } from '../../entities/row.entity';
import { ProjectRepository } from '../../repositories/project.repository';
import { BatchRepository } from '../../repositories/batch.repository';
import { RowRepository } from '../../repositories/row.repository';

@Injectable()
export class UpdateRowStatusUseCase {
  private readonly logger = new Logger(UpdateRowStatusUseCase.name);

  public constructor(
    private readonly projectRepository: ProjectRepository,
    private readonly batchRepository: BatchRepository,
    private readonly rowRepository: RowRepository,
  ) {}

  public async execute(
    projectId: string,
    batchId: string,
    rowId: string,
    userId: string,
    data: UpdateRowStatusData,
  ): Promise<Row> {
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
        `Unauthorized row update attempt - userId: ${userId}, projectId: ${projectId}`,
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

    // Step 6: Find row
    const row = await this.rowRepository.findById(rowId);

    if (!row) {
      throw new NotFoundException('Row not found');
    }

    // Step 7: Defense-in-depth - verify row belongs to batch
    if (row.batchId !== batchId) {
      throw new NotFoundException('Row not found');
    }

    // Step 8: Validate status transition - VALID is final
    if (row.fillStatus === FillStatus.Valid) {
      throw new BadRequestException('Cannot change status of completed row');
    }

    // Step 9: Execute update
    const updatedRow = await this.rowRepository.updateStatus(rowId, data);

    this.logger.log(
      `Row status updated - rowId: ${rowId}, status: ${data.fillStatus}`,
    );

    return updatedRow;
  }
}
