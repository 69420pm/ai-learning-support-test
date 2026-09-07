import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  type Exercise,
  exercises,
  type KnowledgeComponent,
  type KnowledgeDependency,
  knowledgeComponents,
  knowledgeDependencies,
  type NewExercise,
  type NewKnowledgeComponent,
  type NewKnowledgeDependency,
} from '@/lib/db/schema';
import { ChatbotError } from '@/lib/errors';

export async function upsertKnowledgeComponents(
  components: NewKnowledgeComponent[],
): Promise<KnowledgeComponent[]> {
  if (!components || components.length === 0) {
    return [];
  }

  try {
    return await db
      .insert(knowledgeComponents)
      .values(components)
      .onConflictDoUpdate({
        target: [knowledgeComponents.projectId, knowledgeComponents.slug],
        set: {
          name: sql`EXCLUDED.name`,
          pacerCategory: sql`EXCLUDED.pacer_category`,
          bloomLevel: sql`GREATEST(${knowledgeComponents.bloomLevel}, EXCLUDED.bloom_level)`,
          aliases: sql`(
            SELECT COALESCE(jsonb_agg(DISTINCT elem), '[]'::jsonb)
            FROM jsonb_array_elements_text(${knowledgeComponents.aliases} || EXCLUDED.aliases) AS elem
          )`,
          status: sql`EXCLUDED.status`,
          orderIndex: sql`EXCLUDED.order_index`,
          sourceMaterialId: sql`COALESCE(${knowledgeComponents.sourceMaterialId}, EXCLUDED.source_material_id)`,
          updatedAt: new Date(),
        },
      })
      .returning();
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function insertKnowledgeDependencies(
  dependencies: NewKnowledgeDependency[],
): Promise<KnowledgeDependency[]> {
  if (!dependencies || dependencies.length === 0) {
    return [];
  }

  try {
    return await db
      .insert(knowledgeDependencies)
      .values(dependencies)
      .onConflictDoNothing({
        target: [
          knowledgeDependencies.projectId,
          knowledgeDependencies.sourceKcId,
          knowledgeDependencies.targetKcId,
          knowledgeDependencies.relationshipType,
        ],
      })
      .returning();
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getKnowledgeComponentsByProjectId({
  projectId,
}: {
  projectId: string;
}): Promise<KnowledgeComponent[]> {
  try {
    return await db
      .select()
      .from(knowledgeComponents)
      .where(eq(knowledgeComponents.projectId, projectId))
      .orderBy(asc(knowledgeComponents.orderIndex), asc(knowledgeComponents.name));
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getKnowledgeDependenciesByProjectId({
  projectId,
}: {
  projectId: string;
}): Promise<KnowledgeDependency[]> {
  try {
    return await db
      .select()
      .from(knowledgeDependencies)
      .where(eq(knowledgeDependencies.projectId, projectId));
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function insertExercises(exercisesToInsert: NewExercise[]): Promise<Exercise[]> {
  if (!exercisesToInsert || exercisesToInsert.length === 0) {
    return [];
  }

  try {
    return await db.insert(exercises).values(exercisesToInsert).returning();
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getActiveProjectConceptNames({
  projectId,
  limit = 500,
}: {
  projectId: string;
  limit?: number;
}): Promise<string[]> {
  try {
    const rows = await db
      .select({
        name: knowledgeComponents.name,
      })
      .from(knowledgeComponents)
      .where(
        and(eq(knowledgeComponents.projectId, projectId), eq(knowledgeComponents.status, 'active')),
      )
      .orderBy(desc(knowledgeComponents.updatedAt))
      .limit(limit + 1);

    if (rows.length > limit) {
      console.warn(
        `[vocabulary-grounding] Project ${projectId} has active concepts exceeding limit of ${limit}. Using the ${limit} most recently updated concepts.`,
      );
      return rows.slice(0, limit).map((r) => r.name);
    }

    return rows.map((r) => r.name);
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function cleanupMaterialExtractedGraph({
  materialId,
  projectId,
}: {
  materialId: string;
  projectId: string;
}): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await tx
        .delete(exercises)
        .where(and(eq(exercises.materialId, materialId), eq(exercises.projectId, projectId)));
      await tx
        .delete(knowledgeDependencies)
        .where(
          and(
            eq(knowledgeDependencies.sourceMaterialId, materialId),
            eq(knowledgeDependencies.projectId, projectId),
          ),
        );
    });
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}
