import {
  CreateProjectData,
  Project,
  ProjectSummary,
  UpdateProjectData,
} from '../entities/project.entity';

export abstract class ProjectRepository {
  public abstract findById(id: string, userId: string): Promise<Project | null>;
  public abstract findByIdOnly(id: string): Promise<Project | null>;
  public abstract findAllByUserId(userId: string): Promise<Project[]>;
  public abstract findAllSummariesByUserId(
    userId: string,
  ): Promise<ProjectSummary[]>;
  public abstract create(data: CreateProjectData): Promise<Project>;
  public abstract update(
    id: string,
    userId: string,
    data: UpdateProjectData,
  ): Promise<Project | null>;
  public abstract softDelete(id: string, userId: string): Promise<void>;
}
