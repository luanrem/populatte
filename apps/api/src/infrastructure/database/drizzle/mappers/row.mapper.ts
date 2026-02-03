import {
  Row,
  RowStatus,
  FillStatus,
  ValidationMessage,
} from '../../../../core/entities/row.entity';
import type { IngestionRowRow } from '../schema/ingestion-rows.schema';

export class RowMapper {
  public static toDomain(row: IngestionRowRow): Row {
    return {
      id: row.id,
      batchId: row.batchId,
      data: (row.data ?? {}) as Record<string, unknown>,
      status: row.status as RowStatus,
      validationMessages: (row.validationMessages ?? []) as ValidationMessage[],
      sourceFileName: row.sourceFileName,
      sourceSheetName: row.sourceSheetName,
      sourceRowIndex: row.sourceRowIndex,
      fillStatus: (row.fillStatus ?? 'PENDING') as FillStatus,
      fillErrorMessage: row.fillErrorMessage ?? null,
      fillErrorStep: row.fillErrorStep ?? null,
      fillUpdatedAt: row.fillUpdatedAt ?? null,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
      deletedAt: row.deletedAt ?? null,
    };
  }
}
