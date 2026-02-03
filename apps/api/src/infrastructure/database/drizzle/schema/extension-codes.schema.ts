import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const extensionCodes = pgTable(
  'extension_codes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    code: text('code').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('idx_extension_codes_code').on(table.code),
    index('idx_extension_codes_user_id').on(table.userId),
  ],
);

export type ExtensionCodeRow = typeof extensionCodes.$inferSelect;
export type ExtensionCodeInsert = typeof extensionCodes.$inferInsert;
