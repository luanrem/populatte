import { Injectable } from '@nestjs/common';
import { and, asc, count, desc, eq, isNull, sql } from 'drizzle-orm';

import {
  CreateMappingData,
  Mapping,
  UpdateMappingData,
} from '../../../../core/entities/mapping.entity';
import {
  MappingRepository,
  PaginatedMappings,
} from '../../../../core/repositories/mapping.repository';
import { DrizzleService } from '../drizzle.service';
import { mappings, steps } from '../schema';
import { MappingMapper } from '../mappers/mapping.mapper';

@Injectable()
export class DrizzleMappingRepository extends MappingRepository {
  public constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  public async findById(id: string): Promise<Mapping | null> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(mappings)
      .where(and(eq(mappings.id, id), isNull(mappings.deletedAt)))
      .limit(1);

    const row = result[0];
    return row ? MappingMapper.toDomain(row) : null;
  }

  public async findByIdWithDeleted(id: string): Promise<Mapping | null> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(mappings)
      .where(eq(mappings.id, id))
      .limit(1);

    const row = result[0];
    return row ? MappingMapper.toDomain(row) : null;
  }

  public async findByProjectId(projectId: string): Promise<Mapping[]> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(mappings)
      .where(and(eq(mappings.projectId, projectId), isNull(mappings.deletedAt)))
      .orderBy(asc(mappings.createdAt));

    return result.map((row) => MappingMapper.toDomain(row));
  }

  public async findByProjectIdPaginated(
    projectId: string,
    limit: number,
    offset: number,
    targetUrl?: string,
    isActive?: boolean,
  ): Promise<PaginatedMappings> {
    // Build conditions array
    const conditions = [
      eq(mappings.projectId, projectId),
      isNull(mappings.deletedAt),
    ];

    // Add URL filter if provided (inverted prefix: currentUrl LIKE storedUrl%)
    if (targetUrl !== undefined) {
      conditions.push(sql`${targetUrl} LIKE ${mappings.targetUrl} || '%'`);
    }

    // Add isActive filter if provided
    if (isActive !== undefined) {
      conditions.push(eq(mappings.isActive, isActive));
    }

    const whereClause = and(...conditions);

    // Run data and count queries in parallel
    const [dataResult, countResult] = await Promise.all([
      this.drizzle
        .getClient()
        .select()
        .from(mappings)
        .where(whereClause)
        .orderBy(desc(mappings.createdAt))
        .limit(limit)
        .offset(offset),
      this.drizzle
        .getClient()
        .select({ count: count() })
        .from(mappings)
        .where(whereClause),
    ]);

    const total = countResult[0]?.count ?? 0;

    return {
      items: dataResult.map((row) => MappingMapper.toDomain(row)),
      total,
    };
  }

  public async countStepsByMappingId(mappingId: string): Promise<number> {
    const result = await this.drizzle
      .getClient()
      .select({ count: count() })
      .from(steps)
      .where(eq(steps.mappingId, mappingId));

    return result[0]?.count ?? 0;
  }

  public async create(data: CreateMappingData): Promise<Mapping> {
    const result = await this.drizzle
      .getClient()
      .insert(mappings)
      .values({
        projectId: data.projectId,
        name: data.name,
        targetUrl: data.targetUrl,
        successTrigger: data.successTrigger ?? null,
        successConfig: data.successConfig ?? null,
      })
      .returning();

    const row = result[0];
    if (!row) {
      throw new Error('Failed to create mapping');
    }

    return MappingMapper.toDomain(row);
  }

  public async update(
    id: string,
    data: UpdateMappingData,
  ): Promise<Mapping | null> {
    const result = await this.drizzle
      .getClient()
      .update(mappings)
      .set({
        ...(data.name !== undefined && { name: data.name }),
        ...(data.targetUrl !== undefined && { targetUrl: data.targetUrl }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.successTrigger !== undefined && {
          successTrigger: data.successTrigger,
        }),
        ...(data.successConfig !== undefined && {
          successConfig: data.successConfig,
        }),
        updatedAt: new Date(),
      })
      .where(and(eq(mappings.id, id), isNull(mappings.deletedAt)))
      .returning();

    const row = result[0];
    return row ? MappingMapper.toDomain(row) : null;
  }

  public async softDelete(id: string): Promise<void> {
    await this.drizzle
      .getClient()
      .update(mappings)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(mappings.id, id), isNull(mappings.deletedAt)));
  }
}
