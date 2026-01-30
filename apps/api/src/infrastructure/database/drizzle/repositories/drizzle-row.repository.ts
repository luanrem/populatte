import { Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import {
  CreateRowData,
  Row,
  RowStatus,
} from '../../../../core/entities/row.entity';
import type { IngestionRowInsert } from '../schema/ingestion-rows.schema';
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
}
