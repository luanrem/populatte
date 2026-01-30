import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';

import { Batch, CreateBatchData } from '../../../../core/entities/batch.entity';
import { PaginatedResult } from '../../../../core/entities/pagination.types';
import { BatchRepository } from '../../../../core/repositories/batch.repository';
import { DrizzleService } from '../drizzle.service';
import { ingestionBatches } from '../schema';
import { BatchMapper } from '../mappers/batch.mapper';

@Injectable()
export class DrizzleBatchRepository extends BatchRepository {
  public constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  public async create(data: CreateBatchData): Promise<Batch> {
    const result = await this.drizzle
      .getClient()
      .insert(ingestionBatches)
      .values({
        projectId: data.projectId,
        userId: data.userId,
        mode: data.mode,
        name: data.name ?? null,
        fileCount: data.fileCount,
        rowCount: data.rowCount,
        columnMetadata: data.columnMetadata,
      })
      .returning();

    const row = result[0];
    if (!row) {
      throw new Error('Failed to create batch');
    }

    return BatchMapper.toDomain(row);
  }

  public async findById(id: string): Promise<Batch | null> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(ingestionBatches)
      .where(
        and(eq(ingestionBatches.id, id), isNull(ingestionBatches.deletedAt)),
      )
      .limit(1);

    const row = result[0];
    return row ? BatchMapper.toDomain(row) : null;
  }

  public async findByProjectId(projectId: string): Promise<Batch[]> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(ingestionBatches)
      .where(
        and(
          eq(ingestionBatches.projectId, projectId),
          isNull(ingestionBatches.deletedAt),
        ),
      )
      .orderBy(desc(ingestionBatches.createdAt));

    return result.map((row) => BatchMapper.toDomain(row));
  }

  public async findByProjectIdPaginated(
    projectId: string,
    limit: number,
    offset: number,
  ): Promise<PaginatedResult<Batch>> {
    const conditions = and(
      eq(ingestionBatches.projectId, projectId),
      isNull(ingestionBatches.deletedAt),
    );

    const [data, countResult] = await Promise.all([
      this.drizzle
        .getClient()
        .select()
        .from(ingestionBatches)
        .where(conditions)
        .orderBy(desc(ingestionBatches.createdAt))
        .limit(limit)
        .offset(offset),
      this.drizzle
        .getClient()
        .select({ count: count() })
        .from(ingestionBatches)
        .where(conditions),
    ]);

    const total = countResult[0]?.count ?? 0;
    return {
      items: data.map((row) => BatchMapper.toDomain(row)),
      total,
    };
  }

  public async softDelete(id: string, deletedBy: string): Promise<void> {
    await this.drizzle
      .getClient()
      .update(ingestionBatches)
      .set({
        deletedAt: new Date(),
        deletedBy,
        updatedAt: new Date(),
      })
      .where(
        and(eq(ingestionBatches.id, id), isNull(ingestionBatches.deletedAt)),
      );
  }
}
