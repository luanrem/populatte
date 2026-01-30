import {
  Project,
  ProjectStatus,
} from '../../../../core/entities/project.entity';
import type { ProjectRow } from '../schema/projects.schema';

export class ProjectMapper {
  public static toDomain(row: ProjectRow): Project {
    return {
      id: row.id,
      userId: row.userId,
      name: row.name,
      description: row.description,
      targetEntity: row.targetEntity,
      targetUrl: row.targetUrl,
      status: row.status as ProjectStatus,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
      deletedAt: row.deletedAt,
    };
  }
}
