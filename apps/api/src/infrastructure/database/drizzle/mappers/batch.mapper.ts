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
      columnMetadata: BatchMapper.mapColumnMetadata(row.columnMetadata),
      identifierFieldKey: row.identifierFieldKey ?? null,
      secondaryFieldKey: row.secondaryFieldKey ?? null,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
      deletedAt: row.deletedAt ?? null,
      deletedBy: row.deletedBy ?? null,
    };
  }

  /**
   * Maps the raw JSONB `column_metadata` into domain `ColumnMetadata`,
   * defaulting `label` to `normalizedKey` for legacy rows persisted before the
   * label annotation existed (ADR 0001 / POP-24, F1 — backward-compatible read).
   */
  private static mapColumnMetadata(raw: unknown): ColumnMetadata[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return (raw as Array<Partial<ColumnMetadata>>).map((col) => {
      const normalizedKey = col.normalizedKey ?? '';
      return {
        label: col.label ?? normalizedKey,
        originalHeader: col.originalHeader ?? normalizedKey,
        normalizedKey,
        inferredType: col.inferredType ?? '',
        position: col.position ?? 0,
      };
    });
  }
}
