import {
  pgTable,
  pgEnum,
  uuid,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';

import { mappings } from './mappings.schema';

export const stepActionEnum = pgEnum('step_action', ['fill', 'click', 'wait']);

export const steps = pgTable(
  'steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mappingId: uuid('mapping_id')
      .notNull()
      .references(() => mappings.id),
    action: stepActionEnum('action').notNull(),
    selector: jsonb('selector')
      .notNull()
      .$type<{ type: 'css' | 'xpath'; value: string }>(),
    selectorFallbacks: jsonb('selector_fallbacks')
      .notNull()
      .default('[]')
      .$type<Array<{ type: 'css' | 'xpath'; value: string }>>(),
    sourceFieldKey: text('source_field_key'),
    fixedValue: text('fixed_value'),
    stepOrder: integer('step_order').notNull(),
    optional: boolean('optional').notNull().default(false),
    clearBefore: boolean('clear_before').notNull().default(false),
    pressEnter: boolean('press_enter').notNull().default(false),
    waitMs: integer('wait_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_steps_mapping_id').on(table.mappingId),
    index('idx_steps_mapping_order').on(table.mappingId, table.stepOrder),
  ],
);

export type StepRow = typeof steps.$inferSelect;
export type StepInsert = typeof steps.$inferInsert;
