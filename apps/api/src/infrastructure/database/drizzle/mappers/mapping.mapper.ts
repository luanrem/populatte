import {
  Mapping,
  SuccessConfig,
  SuccessTrigger,
} from '../../../../core/entities/mapping.entity';
import type { MappingRow } from '../schema/mappings.schema';

export class MappingMapper {
  public static toDomain(row: MappingRow): Mapping {
    return {
      id: row.id,
      projectId: row.projectId,
      name: row.name,
      targetUrl: row.targetUrl,
      isActive: row.isActive,
      successTrigger: row.successTrigger as SuccessTrigger | null,
      successConfig: (row.successConfig ?? null) as SuccessConfig | null,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
      deletedAt: row.deletedAt,
    };
  }
}
