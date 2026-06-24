import {
  Project,
  ProjectStatus,
  ProjectSummary,
  ProjectUrl,
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
      urls: row.urls ?? [],
      status: row.status as ProjectStatus,
      createdAt: row.createdAt ?? new Date(),
      updatedAt: row.updatedAt ?? new Date(),
      deletedAt: row.deletedAt,
    };
  }

  public static toSummary(row: {
    id: string;
    name: string;
    description: string | null;
    targetEntity: string | null;
    urls: ProjectUrl[] | null;
    status: string;
  }): ProjectSummary {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      targetEntity: row.targetEntity,
      urls: row.urls ?? [],
      status: row.status as ProjectStatus,
    };
  }
}
