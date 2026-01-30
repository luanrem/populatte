import {
  Batch,
  BatchMode,
  BatchStatus,
  ColumnMetadata,
} from '../../../../core/entities/batch.entity';
import type { IngestionBatchRow } from '../schema/ingestion-batches.schema';

export class BatchMapper {
  public static toDomain(row: IngestionBatchRow): Batch {
    return {
      id: row.id,
      projectId: row.projectId,
      userId: row.userId,
      mode: row.mode as BatchMode,
      name: row.name ?? null,
      status: row.status as BatchStatus,
      fileCount: row.fileCount,
      rowCount: row.rowCount,
      columnMetadata: (row.columnMetadata ?? []) as ColumnMetadata[],
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
      deletedAt: row.deletedAt ?? null,
      deletedBy: row.deletedBy ?? null,
    };
  }
}
