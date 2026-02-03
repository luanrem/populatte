import {
  CreateMappingData,
  Mapping,
  UpdateMappingData,
} from '../entities/mapping.entity';

export interface PaginatedMappings {
  items: Mapping[];
  total: number;
}

export abstract class MappingRepository {
  public abstract findById(id: string): Promise<Mapping | null>;
  public abstract findByIdWithDeleted(id: string): Promise<Mapping | null>;
  public abstract findByProjectId(projectId: string): Promise<Mapping[]>;
  public abstract findByProjectIdPaginated(
    projectId: string,
    limit: number,
    offset: number,
    targetUrl?: string,
    isActive?: boolean,
  ): Promise<PaginatedMappings>;
  public abstract countStepsByMappingId(mappingId: string): Promise<number>;
  public abstract create(data: CreateMappingData): Promise<Mapping>;
  public abstract update(
    id: string,
    data: UpdateMappingData,
  ): Promise<Mapping | null>;
  public abstract softDelete(id: string): Promise<void>;
}
