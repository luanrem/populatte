import { Batch, CreateBatchData } from '../entities/batch.entity';
import { PaginatedResult } from '../entities/pagination.types';

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
}
