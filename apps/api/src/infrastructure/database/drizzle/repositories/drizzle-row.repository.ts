import { Injectable } from '@nestjs/common';
import { and, asc, count, eq, isNull } from 'drizzle-orm';

import {
  CreateRowData,
  Row,
  RowStatus,
} from '../../../../core/entities/row.entity';
import type { IngestionRowInsert } from '../schema/ingestion-rows.schema';
import { PaginatedResult } from '../../../../core/entities/pagination.types';
import { RowRepository } from '../../../../core/repositories/row.repository';
import { DrizzleService } from '../drizzle.service';
import { ingestionRows } from '../schema';
import { RowMapper } from '../mappers/row.mapper';

@Injectable()
export class DrizzleRowRepository extends RowRepository {
  public constructor(private readonly drizzle: DrizzleService) {
    super();
  }

  public async createMany(data: CreateRowData[]): Promise<void> {
    const CHUNK_SIZE = 5000;

    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.slice(i, i + CHUNK_SIZE);
      const values: IngestionRowInsert[] = chunk.map((row) => ({
        batchId: row.batchId,
        data: row.data,
        status: (row.status ?? RowStatus.Draft) as IngestionRowInsert['status'],
        validationMessages: row.validationMessages ?? [],
        sourceFileName: row.sourceFileName,
        sourceSheetName: row.sourceSheetName,
        sourceRowIndex: row.sourceRowIndex,
      }));

      await this.drizzle.getClient().insert(ingestionRows).values(values);
    }
  }

  public async findByBatchId(batchId: string): Promise<Row[]> {
    const result = await this.drizzle
      .getClient()
      .select()
      .from(ingestionRows)
      .where(
        and(
          eq(ingestionRows.batchId, batchId),
          isNull(ingestionRows.deletedAt),
        ),
      );

    return result.map((row) => RowMapper.toDomain(row));
  }

  public async findByBatchIdPaginated(
    batchId: string,
    limit: number,
    offset: number,
  ): Promise<PaginatedResult<Row>> {
    const conditions = and(
      eq(ingestionRows.batchId, batchId),
      isNull(ingestionRows.deletedAt),
    );

    const [data, countResult] = await Promise.all([
      this.drizzle
        .getClient()
        .select()
        .from(ingestionRows)
        .where(conditions)
        .orderBy(asc(ingestionRows.sourceRowIndex), asc(ingestionRows.id))
        .limit(limit)
        .offset(offset),
      this.drizzle
        .getClient()
        .select({ count: count() })
        .from(ingestionRows)
        .where(conditions),
    ]);

    const total = countResult[0]?.count ?? 0;
    return {
      items: data.map((row) => RowMapper.toDomain(row)),
      total,
    };
  }
}
