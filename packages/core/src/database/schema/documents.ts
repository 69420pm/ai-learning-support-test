import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const documents = sqliteTable("documents", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	name: text("name").notNull(),
	storagePath: text("storage_path").notNull(),
	fileSize: integer("file_size").notNull(),
	status: text("status").$type<"pending" | "processing" | "completed" | "failed">().notNull(),
	createdAt: integer("created_at").notNull(),
	updatedAt: integer("updated_at").notNull(),
});

export type DocumentRow = typeof documents.$inferSelect;
export type NewDocumentRow = typeof documents.$inferInsert;
