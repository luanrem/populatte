import {
  pgTable,
  pgEnum,
  uuid,
  integer,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

import { projects } from './projects.schema';
import { users } from './users.schema';

export const batchStatusEnum = pgEnum('batch_status', [
  'PROCESSING',
  'COMPLETED',
  'FAILED',
]);

export const batchModeEnum = pgEnum('batch_mode', [
  'LIST_MODE',
  'PROFILE_MODE',
]);

export const ingestionBatches = pgTable(
  'ingestion_batches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    mode: batchModeEnum('mode').notNull(),
    status: batchStatusEnum('status').notNull().default('PROCESSING'),
    fileCount: integer('file_count').notNull(),
    rowCount: integer('row_count').notNull(),
    columnMetadata: jsonb('column_metadata').notNull().default('[]'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    deletedBy: uuid('deleted_by').references(() => users.id),
  },
  (table) => [
    index('idx_ingestion_batches_project_id').on(table.projectId),
    index('idx_ingestion_batches_user_id').on(table.userId),
  ],
);

export type IngestionBatchRow = typeof ingestionBatches.$inferSelect;
export type IngestionBatchInsert = typeof ingestionBatches.$inferInsert;
