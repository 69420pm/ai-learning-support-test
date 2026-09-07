import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  vector,
} from 'drizzle-orm/pg-core';
import { materials } from './materials';
import { authUsers } from './profiles';
import { projects } from './projects';

export const PACER_CATEGORIES = [
  'procedural',
  'analogous',
  'conceptual',
  'evidence',
  'reference',
] as const;

export type PacerCategory = (typeof PACER_CATEGORIES)[number];

export const knowledgeComponents = pgTable(
  'knowledge_components',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    pacerCategory: text('pacer_category').$type<PacerCategory>().notNull(),
    bloomLevel: integer('bloom_level').notNull(),
    aliases: jsonb('aliases').$type<string[]>().notNull().default([]),
    embedding: vector('embedding', { dimensions: 768 }),
    sourceMaterialId: uuid('source_material_id').references(() => materials.id, {
      onDelete: 'set null',
    }),
    status: text('status').notNull().default('active'),
    orderIndex: integer('order_index').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_kc_project_slug').on(table.projectId, table.slug),
    index('idx_kc_project_id').on(table.projectId),
  ],
);

export type KnowledgeComponent = typeof knowledgeComponents.$inferSelect;
export type NewKnowledgeComponent = typeof knowledgeComponents.$inferInsert;

export const knowledgeDependencies = pgTable(
  'knowledge_dependencies',
  {
    id: uuid('id').primaryKey().notNull().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    sourceKcId: uuid('source_kc_id')
      .notNull()
      .references(() => knowledgeComponents.id, { onDelete: 'cascade' }),
    targetKcId: uuid('target_kc_id')
      .notNull()
      .references(() => knowledgeComponents.id, { onDelete: 'cascade' }),
    relationshipType: text('relationship_type').notNull().default('prerequisite'),
    reasoning: text('reasoning'),
    isTransitive: boolean('is_transitive').notNull().default(false),
    sourceMaterialId: uuid('source_material_id').references(() => materials.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_kd_project_source_target_rel').on(
      table.projectId,
      table.sourceKcId,
      table.targetKcId,
      table.relationshipType,
    ),
    index('idx_kd_project_target').on(table.projectId, table.targetKcId),
    index('idx_kd_project_source').on(table.projectId, table.sourceKcId),
  ],
);

export type KnowledgeDependency = typeof knowledgeDependencies.$inferSelect;
export type NewKnowledgeDependency = typeof knowledgeDependencies.$inferInsert;
