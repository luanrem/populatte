import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

import type { ProjectUrl } from '../../../../core/entities/project.entity';
import { users } from './users.schema';

export const projectStatusEnum = pgEnum('project_status', [
  'active',
  'archived',
]);

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    targetEntity: text('target_entity'),
    urls: jsonb('urls')
      .$type<ProjectUrl[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    status: projectStatusEnum('status').notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_projects_user_id').on(table.userId),
    uniqueIndex('uq_projects_user_name')
      .on(table.userId, table.name)
      .where(sql`deleted_at IS NULL`),
  ],
);

export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;
