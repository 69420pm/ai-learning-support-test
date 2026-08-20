import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  vector,
} from 'drizzle-orm/pg-core';
import { authUsers } from './profiles';
import { projects } from './projects';

export const materialStatusEnum = ['pending', 'processing', 'ready', 'failed'] as const;
export type MaterialStatus = (typeof materialStatusEnum)[number];

export const materials = pgTable(
  'materials',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    filename: text('filename').notNull(),
    fileType: varchar('file_type', { length: 64 }).notNull(),
    fileSize: integer('file_size').notNull().default(0),
    storagePath: text('storage_path').notNull(),
    status: varchar('status', { length: 32, enum: materialStatusEnum })
      .notNull()
      .default('pending'),
    errorMessage: text('error_message'),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('materials_project_id_idx').on(table.projectId),
    index('materials_user_id_idx').on(table.userId),
    index('materials_project_id_created_at_idx').on(table.projectId, table.createdAt),
  ],
);

export type Material = typeof materials.$inferSelect;
export type NewMaterial = typeof materials.$inferInsert;

export const materialChunks = pgTable(
  'material_chunks',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    materialId: uuid('material_id')
      .notNull()
      .references(() => materials.id, { onDelete: 'cascade' }),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    content: text('content').notNull(),
    tokenCount: integer('token_count').notNull().default(0),
    embedding: vector('embedding', { dimensions: 768 }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('material_chunks_material_id_idx').on(table.materialId),
    index('material_chunks_project_id_idx').on(table.projectId),
    index('material_chunks_project_id_chunk_idx').on(table.projectId, table.chunkIndex),
    index('material_chunks_embedding_hnsw_idx').using(
      'hnsw',
      table.embedding.op('vector_cosine_ops'),
    ),
  ],
);

export type MaterialChunk = typeof materialChunks.$inferSelect;
export type NewMaterialChunk = typeof materialChunks.$inferInsert;
