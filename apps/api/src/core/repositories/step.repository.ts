import { CreateStepData, Step, UpdateStepData } from '../entities/step.entity';

export abstract class StepRepository {
  public abstract findById(id: string): Promise<Step | null>;
  public abstract findByMappingId(mappingId: string): Promise<Step[]>;
  public abstract getMaxStepOrder(mappingId: string): Promise<number>;
  public abstract create(data: CreateStepData): Promise<Step>;
  public abstract update(
    id: string,
    data: UpdateStepData,
  ): Promise<Step | null>;
  public abstract delete(id: string): Promise<void>;
  public abstract reorder(
    mappingId: string,
    orderedStepIds: string[],
  ): Promise<Step[]>;
}
