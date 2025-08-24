import { pgTable, text, timestamp, varchar } from 'drizzle-orm/pg-core';

export const blockedCidrs = pgTable('blocked_cidrs', {
  cidr: varchar('cidr').primaryKey(),
  reason: text('reason').notNull(),
  expiresAt: timestamp('expiresAt'),
  createdBy: varchar('created_by').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type BlockedCidr = typeof blockedCidrs.$inferSelect;
export type NewBlockedCidr = typeof blockedCidrs.$inferInsert;
