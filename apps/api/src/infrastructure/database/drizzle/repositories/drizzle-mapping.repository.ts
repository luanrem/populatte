import { Injectable } from '@nestjs/common';
import { and, asc, eq, isNull } from 'drizzle-orm';

import {
  CreateMappingData,
  Mapping,
  UpdateMappingData,
} from '../../../../core/entities/mapping.entity';
import { MappingRepository } from '../../../../core/repositories/mapping.repository';
import { DrizzleService } from '../drizzle.service';
import { mappings } from '../schema';
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

  public async findByProjectId(projectId: string): Promise<Mapping[]> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(mappings)
      .where(and(eq(mappings.projectId, projectId), isNull(mappings.deletedAt)))
      .orderBy(asc(mappings.createdAt));

    return result.map((row) => MappingMapper.toDomain(row));
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
