import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import {
  Batch,
  ColumnLabelUpdate,
  ColumnMetadata,
} from '../../entities/batch.entity';
import { BatchRepository } from '../../repositories/batch.repository';
import { ProjectRepository } from '../../repositories/project.repository';

/**
 * INBOUND label write path (ADR 0001 / POP-24, F2).
 *
 * Relabels existing columns of a batch. Enforces the core invariant that
 * `normalizedKey` is immutable: only the `label` of an already-existing key may
 * change. Unknown keys are rejected, which makes it impossible to create or
 * rename a key through this path. See docs/adr/0002-normalizedkey-immutability.md.
 */
@Injectable()
export class UpdateColumnMetadataUseCase {
  private readonly logger = new Logger(UpdateColumnMetadataUseCase.name);

  public constructor(
    private readonly batchRepository: BatchRepository,
    private readonly projectRepository: ProjectRepository,
  ) {}

  public async execute(
    projectId: string,
    batchId: string,
    userId: string,
    updates: ColumnLabelUpdate[],
  ): Promise<Batch> {
    // 1. Verify project ownership (defense-in-depth, mirrors UpdateBatchUseCase)
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

    // 2. Load batch and verify it belongs to the project
    const batch = await this.batchRepository.findById(batchId);
    if (!batch || batch.projectId !== projectId) {
      throw new NotFoundException('Batch not found');
    }

    // 3. Immutability guard + merge: only relabel EXISTING keys. A request that
    //    references a key not present in the batch is rejected — normalizedKey
    //    can never be created, renamed or removed through this path.
    const knownKeys = new Set(
      batch.columnMetadata.map((column) => column.normalizedKey),
    );
    const labelByKey = new Map<string, string>();
    for (const update of updates) {
      if (!knownKeys.has(update.normalizedKey)) {
        throw new BadRequestException(
          `Unknown column key '${update.normalizedKey}': normalizedKey is immutable and cannot be created or renamed`,
        );
      }
      if (labelByKey.has(update.normalizedKey)) {
        throw new BadRequestException(
          `Duplicate column key '${update.normalizedKey}' in request`,
        );
      }
      labelByKey.set(update.normalizedKey, update.label);
    }

    const merged: ColumnMetadata[] = batch.columnMetadata.map((column) => {
      const nextLabel = labelByKey.get(column.normalizedKey);
      return nextLabel === undefined ? column : { ...column, label: nextLabel };
    });

    // 4. Persist (only column_metadata changes)
    const updated = await this.batchRepository.updateColumnMetadata(
      batchId,
      merged,
    );
    if (!updated) {
      throw new NotFoundException('Batch not found');
    }

    return updated;
  }
}
