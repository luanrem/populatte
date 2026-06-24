import { Injectable } from '@nestjs/common';
import { and, eq, inArray, isNull } from 'drizzle-orm';

import {
  CreateProjectData,
  Project,
  ProjectSummary,
  UpdateProjectData,
} from '../../../../core/entities/project.entity';
import { ProjectRepository } from '../../../../core/repositories/project.repository';
import { DrizzleService } from '../drizzle.service';
import { ingestionBatches, ingestionRows, projects } from '../schema';
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

  public async findAllSummariesByUserId(
    userId: string,
  ): Promise<ProjectSummary[]> {
    const result = await this.drizzle
      .getClient()
      .select({
        id: projects.id,
        name: projects.name,
        description: projects.description,
        targetEntity: projects.targetEntity,
        urls: projects.urls,
        status: projects.status,
      })
      .from(projects)
      .where(and(eq(projects.userId, userId), isNull(projects.deletedAt)))
      .orderBy(projects.createdAt);

    return result.map((row) => ProjectMapper.toSummary(row));
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
        urls: data.urls,
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
        ...(data.urls !== undefined && { urls: data.urls }),
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
    const now = new Date();

    // 1. Get all batch IDs for this project (before soft-deleting them)
    const batches = await this.drizzle
      .getClient()
      .select({ id: ingestionBatches.id })
      .from(ingestionBatches)
      .where(
        and(
          eq(ingestionBatches.projectId, id),
          isNull(ingestionBatches.deletedAt),
        ),
      );

    const batchIds = batches.map((b) => b.id);

    // 2. Soft-delete all rows in those batches
    if (batchIds.length > 0) {
      await this.drizzle
        .getClient()
        .update(ingestionRows)
        .set({
          deletedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            inArray(ingestionRows.batchId, batchIds),
            isNull(ingestionRows.deletedAt),
          ),
        );
    }

    // 3. Soft-delete all batches for this project
    await this.drizzle
      .getClient()
      .update(ingestionBatches)
      .set({
        deletedAt: now,
        deletedBy: userId,
        updatedAt: now,
      })
      .where(
        and(
          eq(ingestionBatches.projectId, id),
          isNull(ingestionBatches.deletedAt),
        ),
      );

    // 4. Soft-delete the project itself
    await this.drizzle
      .getClient()
      .update(projects)
      .set({ deletedAt: now, updatedAt: now })
      .where(
        and(
          eq(projects.id, id),
          eq(projects.userId, userId),
          isNull(projects.deletedAt),
        ),
      );
  }
}
