import {
  CreateMappingData,
  Mapping,
  UpdateMappingData,
} from '../entities/mapping.entity';

export abstract class MappingRepository {
  public abstract findById(id: string): Promise<Mapping | null>;
  public abstract findByProjectId(projectId: string): Promise<Mapping[]>;
  public abstract create(data: CreateMappingData): Promise<Mapping>;
  public abstract update(
    id: string,
    data: UpdateMappingData,
  ): Promise<Mapping | null>;
  public abstract softDelete(id: string): Promise<void>;
}
