import { pgSchema, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

// Reference to Supabase Auth's auth.users table
export const authUsers = pgSchema('auth').table('users', {
  id: uuid('id').primaryKey(),
});

export const themeEnum = ['system', 'light', 'dark'] as const;
export type Theme = (typeof themeEnum)[number];

export const profiles = pgTable('profiles', {
  id: uuid('id')
    .primaryKey()
    .references(() => authUsers.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  fullName: text('full_name'),
  avatarUrl: text('avatar_url'),
  theme: varchar('theme', { length: 16, enum: themeEnum }).notNull().default('system'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
