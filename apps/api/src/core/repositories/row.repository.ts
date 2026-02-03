import {
  CreateRowData,
  Row,
  UpdateRowStatusData,
} from '../entities/row.entity';
import { PaginatedResult } from '../entities/pagination.types';

export abstract class RowRepository {
  public abstract createMany(data: CreateRowData[]): Promise<void>;
  public abstract findByBatchId(batchId: string): Promise<Row[]>;

  /**
   * Caller MUST verify the parent batch exists and is not soft-deleted before calling.
   */
  public abstract findByBatchIdPaginated(
    batchId: string,
    limit: number,
    offset: number,
  ): Promise<PaginatedResult<Row>>;

  public abstract countByBatchId(batchId: string): Promise<number>;

  public abstract getSampleRows(batchId: string, limit: number): Promise<Row[]>;

  public abstract findById(id: string): Promise<Row | null>;

  public abstract updateStatus(
    id: string,
    data: UpdateRowStatusData,
  ): Promise<Row>;
}
