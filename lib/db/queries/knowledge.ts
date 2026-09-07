import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm';
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

export type GraphNeighborKC = KnowledgeComponent & {
  depth: number;
  relationshipType?: string;
  reasoning?: string | null;
};

export type GraphNeighborConcept = GraphNeighborKC;

export type GraphNeighborhoodResult = {
  concept: KnowledgeComponent | null;
  prerequisites: GraphNeighborKC[];
  unlocked: GraphNeighborKC[];
  depth: number;
};

export type GetGraphNeighborhoodOptions = {
  projectId: string;
  kcId: string;
  depth?: number;
};

export type PrerequisiteChainNode = KnowledgeComponent & {
  depth: number;
  relationshipType?: string;
  reasoning?: string | null;
};

export type GetPrerequisiteChainOptions = {
  projectId: string;
  kcId: string;
  maxDepth?: number;
};

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

async function fetchDirectNeighbors(
  projectId: string,
  kcId: string,
  direction: 'prerequisites' | 'unlocked',
): Promise<GraphNeighborKC[]> {
  const isPrereq = direction === 'prerequisites';
  const joinCondition = isPrereq
    ? eq(knowledgeComponents.id, knowledgeDependencies.sourceKcId)
    : eq(knowledgeComponents.id, knowledgeDependencies.targetKcId);
  const whereCondition = isPrereq
    ? eq(knowledgeDependencies.targetKcId, kcId)
    : eq(knowledgeDependencies.sourceKcId, kcId);

  const rows = await db
    .select({
      concept: knowledgeComponents,
      dependency: {
        relationshipType: knowledgeDependencies.relationshipType,
        reasoning: knowledgeDependencies.reasoning,
      },
    })
    .from(knowledgeDependencies)
    .innerJoin(
      knowledgeComponents,
      and(joinCondition, eq(knowledgeComponents.projectId, projectId)),
    )
    .where(and(eq(knowledgeDependencies.projectId, projectId), whereCondition));

  return rows.map((row) => ({
    ...row.concept,
    depth: 1,
    relationshipType: row.dependency.relationshipType,
    reasoning: row.dependency.reasoning,
  }));
}

async function fetchSecondHopNeighbors(
  projectId: string,
  hop1Ids: string[],
  visitedIds: Set<string>,
  direction: 'prerequisites' | 'unlocked',
): Promise<GraphNeighborKC[]> {
  if (hop1Ids.length === 0) return [];

  const isPrereq = direction === 'prerequisites';
  const joinCondition = isPrereq
    ? eq(knowledgeComponents.id, knowledgeDependencies.sourceKcId)
    : eq(knowledgeComponents.id, knowledgeDependencies.targetKcId);
  const whereCondition = isPrereq
    ? inArray(knowledgeDependencies.targetKcId, hop1Ids)
    : inArray(knowledgeDependencies.sourceKcId, hop1Ids);

  const rows = await db
    .select({
      concept: knowledgeComponents,
      dependency: {
        relationshipType: knowledgeDependencies.relationshipType,
        reasoning: knowledgeDependencies.reasoning,
      },
    })
    .from(knowledgeDependencies)
    .innerJoin(
      knowledgeComponents,
      and(joinCondition, eq(knowledgeComponents.projectId, projectId)),
    )
    .where(and(eq(knowledgeDependencies.projectId, projectId), whereCondition));

  const hop2Neighbors: GraphNeighborKC[] = [];
  for (const row of rows) {
    if (!visitedIds.has(row.concept.id)) {
      visitedIds.add(row.concept.id);
      hop2Neighbors.push({
        ...row.concept,
        depth: 2,
        relationshipType: row.dependency.relationshipType,
        reasoning: row.dependency.reasoning,
      });
    }
  }
  return hop2Neighbors;
}

export function getGraphNeighborhood(
  projectId: string,
  kcId: string,
  depth?: number,
): Promise<GraphNeighborhoodResult>;
export function getGraphNeighborhood(
  options: GetGraphNeighborhoodOptions,
): Promise<GraphNeighborhoodResult>;
export async function getGraphNeighborhood(
  projectIdOrOptions: string | GetGraphNeighborhoodOptions,
  kcIdParam?: string,
  depthParam = 1,
): Promise<GraphNeighborhoodResult> {
  const {
    projectId,
    kcId,
    depth = 1,
  } = typeof projectIdOrOptions === 'string'
    ? { projectId: projectIdOrOptions, kcId: kcIdParam ?? '', depth: depthParam }
    : projectIdOrOptions;

  const safeDepth = Math.max(1, Math.min(2, Math.floor(depth)));

  if (!projectId || !kcId) {
    return { concept: null, prerequisites: [], unlocked: [], depth: safeDepth };
  }

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(kcId);
    const conceptFilter = isUuid
      ? or(
          eq(knowledgeComponents.id, kcId),
          eq(knowledgeComponents.slug, kcId),
          eq(knowledgeComponents.name, kcId),
        )
      : or(eq(knowledgeComponents.slug, kcId), eq(knowledgeComponents.name, kcId));

    const [concept] = await db
      .select()
      .from(knowledgeComponents)
      .where(and(eq(knowledgeComponents.projectId, projectId), conceptFilter))
      .limit(1);

    if (!concept) {
      return { concept: null, prerequisites: [], unlocked: [], depth: safeDepth };
    }

    const hop1Prereqs = await fetchDirectNeighbors(projectId, concept.id, 'prerequisites');
    const hop1Unlocked = await fetchDirectNeighbors(projectId, concept.id, 'unlocked');

    let hop2Prereqs: GraphNeighborKC[] = [];
    let hop2Unlocked: GraphNeighborKC[] = [];

    if (safeDepth === 2) {
      const visitedPrereqs = new Set([concept.id, ...hop1Prereqs.map((p) => p.id)]);
      hop2Prereqs = await fetchSecondHopNeighbors(
        projectId,
        hop1Prereqs.map((p) => p.id),
        visitedPrereqs,
        'prerequisites',
      );

      const visitedUnlocked = new Set([concept.id, ...hop1Unlocked.map((u) => u.id)]);
      hop2Unlocked = await fetchSecondHopNeighbors(
        projectId,
        hop1Unlocked.map((u) => u.id),
        visitedUnlocked,
        'unlocked',
      );
    }

    return {
      concept,
      prerequisites: [...hop1Prereqs, ...hop2Prereqs],
      unlocked: [...hop1Unlocked, ...hop2Unlocked],
      depth: safeDepth,
    };
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export function getPrerequisiteChain(
  projectId: string,
  kcId: string,
  maxDepth?: number,
): Promise<PrerequisiteChainNode[]>;
export function getPrerequisiteChain(
  options: GetPrerequisiteChainOptions,
): Promise<PrerequisiteChainNode[]>;
export async function getPrerequisiteChain(
  projectIdOrOptions: string | GetPrerequisiteChainOptions,
  kcIdParam?: string,
  maxDepthParam = 10,
): Promise<PrerequisiteChainNode[]> {
  const {
    projectId,
    kcId,
    maxDepth = 10,
  } = typeof projectIdOrOptions === 'string'
    ? { projectId: projectIdOrOptions, kcId: kcIdParam ?? '', maxDepth: maxDepthParam }
    : projectIdOrOptions;

  if (!projectId || !kcId) {
    return [];
  }

  const safeMaxDepth = Math.max(1, Math.min(50, Math.floor(maxDepth)));

  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(kcId);
    const conceptFilter = isUuid
      ? or(
          eq(knowledgeComponents.id, kcId),
          eq(knowledgeComponents.slug, kcId),
          eq(knowledgeComponents.name, kcId),
        )
      : or(eq(knowledgeComponents.slug, kcId), eq(knowledgeComponents.name, kcId));

    const [concept] = await db
      .select({ id: knowledgeComponents.id })
      .from(knowledgeComponents)
      .where(and(eq(knowledgeComponents.projectId, projectId), conceptFilter))
      .limit(1);

    if (!concept) {
      return [];
    }

    const query = sql`
      WITH RECURSIVE prereq_tree AS (
        SELECT
          kd.source_kc_id AS kc_id,
          kd.target_kc_id AS dependent_kc_id,
          1 AS depth,
          ARRAY[kd.target_kc_id::text, kd.source_kc_id::text] AS visited_path,
          kd.relationship_type,
          kd.reasoning
        FROM ${knowledgeDependencies} kd
        WHERE kd.project_id = ${projectId}
          AND kd.target_kc_id = ${concept.id}

        UNION ALL

        SELECT
          kd.source_kc_id AS kc_id,
          kd.target_kc_id AS dependent_kc_id,
          prev.depth + 1 AS depth,
          prev.visited_path || kd.source_kc_id::text AS visited_path,
          kd.relationship_type,
          kd.reasoning
        FROM ${knowledgeDependencies} kd
        JOIN prereq_tree prev ON kd.target_kc_id = prev.kc_id
        WHERE kd.project_id = ${projectId}
          AND prev.depth < ${safeMaxDepth}
          AND NOT (kd.source_kc_id::text = ANY(prev.visited_path))
      ),
      distinct_ancestors AS (
        SELECT DISTINCT ON (pt.kc_id)
          kc.id,
          kc.project_id AS "projectId",
          kc.user_id AS "userId",
          kc.slug,
          kc.name,
          kc.pacer_category AS "pacerCategory",
          kc.bloom_level AS "bloomLevel",
          kc.aliases,
          kc.status,
          kc.order_index AS "orderIndex",
          kc.source_material_id AS "sourceMaterialId",
          pt.depth,
          pt.relationship_type AS "relationshipType",
          pt.reasoning
        FROM prereq_tree pt
        JOIN ${knowledgeComponents} kc ON kc.id = pt.kc_id AND kc.project_id = ${projectId}
        ORDER BY pt.kc_id, pt.depth ASC
      )
      SELECT * FROM distinct_ancestors ORDER BY depth ASC, "orderIndex" ASC, name ASC;
    `;

    const rawRows = await db.execute<PrerequisiteChainNode>(query);
    const rows = Array.isArray(rawRows)
      ? rawRows
      : ((rawRows as unknown as { rows?: PrerequisiteChainNode[] })?.rows ??
        Array.from((rawRows as unknown as Iterable<PrerequisiteChainNode>) ?? []));

    return rows as PrerequisiteChainNode[];
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}
