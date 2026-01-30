import { CreateRowData, Row } from '../entities/row.entity';
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
}
