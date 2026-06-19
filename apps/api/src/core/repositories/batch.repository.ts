import {
  Batch,
  ColumnMetadata,
  CreateBatchData,
  UpdateBatchData,
} from '../entities/batch.entity';
import { PaginatedResult } from '../entities/pagination.types';
import {
  FieldValuesQuery,
  FieldValuesResult,
} from '../entities/field-values.entity';

export interface FieldAggregation {
  fieldName: string;
  presenceCount: number;
  uniqueCount: number;
}

export abstract class BatchRepository {
  public abstract create(data: CreateBatchData): Promise<Batch>;
  public abstract findById(id: string): Promise<Batch | null>;
  public abstract findByProjectId(projectId: string): Promise<Batch[]>;

  /**
   * Caller MUST verify the project exists and is not soft-deleted before calling.
   */
  public abstract findByProjectIdPaginated(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<PaginatedResult<Batch>>;

  public abstract softDelete(id: string, deletedBy: string): Promise<void>;

  public abstract update(
    id: string,
    data: UpdateBatchData,
  ): Promise<Batch | null>;

  /**
   * Replaces the batch's columnMetadata (INBOUND label write path, ADR 0001 /
   * POP-24, F2). The use-case applies the normalizedKey immutability guard
   * before calling this; the repository only persists the merged array.
   */
  public abstract updateColumnMetadata(
    id: string,
    columnMetadata: ColumnMetadata[],
  ): Promise<Batch | null>;

  public abstract softDeleteRowsByBatchId(
    batchId: string,
    deletedBy: string,
  ): Promise<void>;

  public abstract getFieldAggregations(
    batchId: string,
  ): Promise<FieldAggregation[]>;

  /**
   * Returns paginated distinct values for a specific field key.
   * Caller MUST verify batch ownership and field key existence before calling.
   */
  public abstract getFieldValues(
    query: FieldValuesQuery,
  ): Promise<FieldValuesResult>;
}
