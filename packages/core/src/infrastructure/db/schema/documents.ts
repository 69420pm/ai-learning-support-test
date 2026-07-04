import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type { DocumentStatus } from '../../../shared/types/document.js';

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull(),
    name: text('name').notNull(),
    storagePath: text('storage_path').notNull(),
    fileSize: integer('file_size').notNull(),
    status: text('status').$type<DocumentStatus>().notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => ({
    userIdIdx: index('user_id_idx').on(table.userId),
    createdAtIdx: index('created_at_idx').on(table.createdAt),
  }),
);

export type DocumentRow = typeof documents.$inferSelect;
export type NewDocumentRow = typeof documents.$inferInsert;
