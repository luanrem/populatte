import { Batch, CreateBatchData } from '../entities/batch.entity';

export abstract class BatchRepository {
  public abstract create(data: CreateBatchData): Promise<Batch>;
  public abstract findById(id: string): Promise<Batch | null>;
  public abstract findByProjectId(projectId: string): Promise<Batch[]>;
  public abstract softDelete(id: string, deletedBy: string): Promise<void>;
}
