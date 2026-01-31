import { Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull, sql } from 'drizzle-orm';

import { Batch, CreateBatchData } from '../../../../core/entities/batch.entity';
import { PaginatedResult } from '../../../../core/entities/pagination.types';
import {
  FieldValuesQuery,
  FieldValuesResult,
} from '../../../../core/entities/field-values.entity';
import {
  BatchRepository,
  FieldAggregation,
} from '../../../../core/repositories/batch.repository';
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

  public async getFieldAggregations(
    batchId: string,
  ): Promise<FieldAggregation[]> {
    const query = sql`
      WITH field_keys AS (
        SELECT DISTINCT jsonb_object_keys(data) AS key
        FROM ingestion_rows
        WHERE batch_id = ${batchId} AND deleted_at IS NULL
      )
      SELECT
        fk.key AS field_name,
        COUNT(CASE WHEN ir.data->>fk.key IS NOT NULL AND ir.data->>fk.key != '' THEN 1 END)::integer AS presence_count,
        COUNT(DISTINCT ir.data->>fk.key) FILTER (WHERE ir.data->>fk.key IS NOT NULL AND ir.data->>fk.key != '')::integer AS unique_count
      FROM field_keys fk
      LEFT JOIN ingestion_rows ir ON ir.batch_id = ${batchId} AND ir.deleted_at IS NULL
      GROUP BY fk.key
    `;

    const result = await this.drizzle.getClient().execute(query);

    return result.rows.map((row) => ({
      fieldName: String(row.field_name),
      presenceCount: Number(row.presence_count),
      uniqueCount: Number(row.unique_count),
    }));
  }

  public async getFieldValues(
    query: FieldValuesQuery,
  ): Promise<FieldValuesResult> {
    // Query 1: Get paginated values with matching count
    const valuesQuery = query.search
      ? sql`
          WITH field_values AS (
            SELECT DISTINCT data->>${query.fieldKey} AS value
            FROM ingestion_rows
            WHERE batch_id = ${query.batchId}
              AND deleted_at IS NULL
              AND data->>${query.fieldKey} IS NOT NULL
              AND data->>${query.fieldKey} != ''
          )
          SELECT value, COUNT(*) OVER() AS matching_count
          FROM field_values
          WHERE value ILIKE '%' || ${query.search} || '%'
          ORDER BY value ASC
          LIMIT ${query.limit} OFFSET ${query.offset}
        `
      : sql`
          WITH field_values AS (
            SELECT DISTINCT data->>${query.fieldKey} AS value
            FROM ingestion_rows
            WHERE batch_id = ${query.batchId}
              AND deleted_at IS NULL
              AND data->>${query.fieldKey} IS NOT NULL
              AND data->>${query.fieldKey} != ''
          )
          SELECT value, COUNT(*) OVER() AS matching_count
          FROM field_values
          ORDER BY value ASC
          LIMIT ${query.limit} OFFSET ${query.offset}
        `;

    // Query 2: Get total distinct count (regardless of search)
    const totalQuery = sql`
      SELECT COUNT(DISTINCT data->>${query.fieldKey})::integer AS total_count
      FROM ingestion_rows
      WHERE batch_id = ${query.batchId}
        AND deleted_at IS NULL
        AND data->>${query.fieldKey} IS NOT NULL
        AND data->>${query.fieldKey} != ''
    `;

    // Run both queries in parallel
    const [valuesResult, totalResult] = await Promise.all([
      this.drizzle.getClient().execute(valuesQuery),
      this.drizzle.getClient().execute(totalQuery),
    ]);

    const values = valuesResult.rows.map((row) => String(row.value));
    const matchingCount =
      valuesResult.rows.length > 0
        ? Number(valuesResult.rows[0]?.matching_count)
        : 0;
    const totalDistinctCount = Number(totalResult.rows[0]?.total_count ?? 0);

    return {
      values,
      matchingCount,
      totalDistinctCount,
    };
  }
}
