import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const blockedCountries = pgTable('blocked_countries', {
  id: uuid('id').defaultRandom().primaryKey(),
  countryCode: text('country_code').notNull(), // ISO 3166-1 alpha-2
  reason: text('reason').notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type BlockedCountry = typeof blockedCountries.$inferSelect;
export type NewBlockedCountry = typeof blockedCountries.$inferInsert;
