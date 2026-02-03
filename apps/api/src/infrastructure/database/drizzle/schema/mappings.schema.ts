import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import { projects } from './projects.schema';

export const successTriggerEnum = pgEnum('success_trigger', [
  'url_change',
  'element_appears',
]);

export const mappings = pgTable(
  'mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    name: text('name').notNull(),
    targetUrl: text('target_url').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    successTrigger: successTriggerEnum('success_trigger'),
    successConfig: jsonb('success_config').$type<{ selector?: string }>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_mappings_project_id').on(table.projectId),
    index('idx_mappings_project_active')
      .on(table.projectId, table.isActive)
      .where(sql`deleted_at IS NULL`),
  ],
);

export type MappingRow = typeof mappings.$inferSelect;
export type MappingInsert = typeof mappings.$inferInsert;
