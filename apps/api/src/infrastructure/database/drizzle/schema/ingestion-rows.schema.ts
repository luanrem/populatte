import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

import { ingestionBatches } from './ingestion-batches.schema';

export const rowStatusEnum = pgEnum('row_status', [
  'DRAFT',
  'VALID',
  'WARNING',
  'ERROR',
]);

export const fillStatusEnum = pgEnum('fill_status', [
  'PENDING',
  'VALID',
  'ERROR',
]);

export const ingestionRows = pgTable(
  'ingestion_rows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    batchId: uuid('batch_id')
      .notNull()
      .references(() => ingestionBatches.id),
    data: jsonb('data').notNull(),
    status: rowStatusEnum('status').notNull().default('DRAFT'),
    validationMessages: jsonb('validation_messages').notNull().default('[]'),
    sourceFileName: text('source_file_name').notNull(),
    sourceSheetName: text('source_sheet_name').notNull(),
    sourceRowIndex: integer('source_row_index').notNull(),
    fillStatus: fillStatusEnum('fill_status').notNull().default('PENDING'),
    fillErrorMessage: text('fill_error_message'),
    fillErrorStep: text('fill_error_step'),
    fillUpdatedAt: timestamp('fill_updated_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [index('idx_ingestion_rows_batch_id').on(table.batchId)],
);

export type IngestionRowRow = typeof ingestionRows.$inferSelect;
export type IngestionRowInsert = typeof ingestionRows.$inferInsert;
