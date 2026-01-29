import { CreateRowData, Row } from '../entities/row.entity';

export abstract class RowRepository {
  public abstract createMany(data: CreateRowData[]): Promise<void>;
  public abstract findByBatchId(batchId: string): Promise<Row[]>;
}
