import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import {
  CreateProjectData,
  Project,
  UpdateProjectData,
} from '../../../../core/entities/project.entity';
import { ProjectRepository } from '../../../../core/repositories/project.repository';
import { DrizzleService } from '../drizzle.service';
import { projects } from '../schema';
import { ProjectMapper } from '../mappers/project.mapper';

@Injectable()
export class DrizzleProjectRepository extends ProjectRepository {
  public constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  public async findById(id: string, userId: string): Promise<Project | null> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(projects)
      .where(
        and(
          eq(projects.id, id),
          eq(projects.userId, userId),
          isNull(projects.deletedAt),
        ),
      )
      .limit(1);

    const row = result[0];
    return row ? ProjectMapper.toDomain(row) : null;
  }

  public async findByIdOnly(id: string): Promise<Project | null> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(projects)
      .where(and(eq(projects.id, id), isNull(projects.deletedAt)))
      .limit(1);

    const row = result[0];
    return row ? ProjectMapper.toDomain(row) : null;
  }

  public async findAllByUserId(userId: string): Promise<Project[]> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
      .orderBy(projects.createdAt);

    return result.map((row) => ProjectMapper.toDomain(row));
  }

  public async create(data: CreateProjectData): Promise<Project> {
    const result = await this.drizzle
      .getClient()
      .insert(projects)
      .values({
        userId: data.userId,
        name: data.name,
        description: data.description ?? null,
        targetEntity: data.targetEntity ?? null,
        targetUrl: data.targetUrl ?? null,
      })
      .returning();

    const row = result[0];
    if (!row) {
      throw new Error('Failed to create project');
    }

    return ProjectMapper.toDomain(row);
  }

  public async update(
    id: string,
    userId: string,
    data: UpdateProjectData,
  ): Promise<Project | null> {
    const result = await this.drizzle
      .getClient()
      .update(projects)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.targetEntity !== undefined && {
          targetEntity: data.targetEntity,
        }),
        ...(data.targetUrl !== undefined && { targetUrl: data.targetUrl }),
        ...(data.status !== undefined && { status: data.status }),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(projects.id, id),
          eq(projects.userId, userId),
          isNull(projects.deletedAt),
        ),
      )
      .returning();

    const row = result[0];
    return row ? ProjectMapper.toDomain(row) : null;
  }

  public async softDelete(id: string, userId: string): Promise<void> {
    await this.drizzle
      .getClient()
      .update(projects)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(projects.id, id),
          eq(projects.userId, userId),
          isNull(projects.deletedAt),
        ),
      );
  }
}
