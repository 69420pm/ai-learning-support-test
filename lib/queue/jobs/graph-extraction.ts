import { generateObject, type LanguageModel } from 'ai';
import type { PgBoss } from 'pg-boss';
import { CONCEPT_GRAPH_EXTRACTION_PROMPT } from '@/lib/ai/prompts';
import { getLanguageModel } from '@/lib/ai/providers';
import {
  getKnowledgeComponentsByProjectId,
  insertExercises,
  insertKnowledgeDependencies,
  upsertKnowledgeComponents,
} from '@/lib/db/queries/knowledge';
import {
  getMaterialById,
  getMaterialChunksByMaterialId,
  updateMaterialStatus,
} from '@/lib/db/queries/material';
import type {
  KnowledgeComponent,
  Material,
  NewKnowledgeComponent,
  NewKnowledgeDependency,
} from '@/lib/db/schema';
import {
  conceptExtractionSchema,
  type KcIdentifier,
  linkExercisesToKcs,
  type SanitizedExtractionResult,
  sanitizeExtractedGraph,
  sliceMaterialChunksIntoBatches,
  updateMaterialGraphExtractionMetadata,
} from '@/lib/materials/concept-extraction';
import { CONCEPT_GRAPH_EXTRACT_QUEUE, type ConceptGraphExtractJobData } from '@/lib/queue/boss';

export type ExtractionContext = {
  materialId: string;
  projectId: string;
  userId: string;
  model: LanguageModel;
};

export type ProcessGraphExtractionOptions = {
  model?: LanguageModel;
  isFinalAttempt?: boolean;
};

export type ProcessGraphExtractionResult = {
  processedCount: number;
  kcCount: number;
  exerciseCount: number;
};

async function persistKnowledgeGraph(
  ctx: ExtractionContext,
  sanitized: SanitizedExtractionResult,
): Promise<KnowledgeComponent[]> {
  if (sanitized.concepts.length === 0) {
    return [];
  }

  const newKcs: NewKnowledgeComponent[] = sanitized.concepts.map((c, idx) => ({
    projectId: ctx.projectId,
    userId: ctx.userId,
    slug: c.slug,
    name: c.name,
    pacerCategory: c.pacerCategory,
    bloomLevel: c.bloomLevel,
    aliases: c.aliases,
    sourceMaterialId: ctx.materialId,
    status: 'active',
    orderIndex: idx,
  }));

  const upsertedKcs = await upsertKnowledgeComponents(newKcs);
  const slugToId = new Map(upsertedKcs.map((k) => [k.slug, k.id]));

  const newKds: NewKnowledgeDependency[] = [];
  for (const p of sanitized.prerequisites) {
    const sourceKcId = slugToId.get(p.sourceSlug);
    const targetKcId = slugToId.get(p.targetSlug);
    if (sourceKcId && targetKcId) {
      newKds.push({
        projectId: ctx.projectId,
        sourceKcId,
        targetKcId,
        relationshipType: p.relationshipType,
        reasoning: p.reasoning,
        sourceMaterialId: ctx.materialId,
        isTransitive: false,
      });
    }
  }

  if (newKds.length > 0) {
    await insertKnowledgeDependencies(newKds);
  }

  return upsertedKcs;
}

async function persistExtractedExercises(
  ctx: ExtractionContext,
  sanitized: SanitizedExtractionResult,
  upsertedKcs: KnowledgeComponent[],
): Promise<number> {
  if (!sanitized.exercises || sanitized.exercises.length === 0) {
    return 0;
  }

  const existingProjectKcs = await getKnowledgeComponentsByProjectId({
    projectId: ctx.projectId,
  });

  const availableKcsMap = new Map<string, KcIdentifier>();
  for (const kc of [...existingProjectKcs, ...upsertedKcs]) {
    availableKcsMap.set(kc.id, { id: kc.id, name: kc.name, slug: kc.slug });
  }

  const linkedExercises = linkExercisesToKcs({
    exercises: sanitized.exercises,
    availableKcs: Array.from(availableKcsMap.values()),
    projectId: ctx.projectId,
    userId: ctx.userId,
    materialId: ctx.materialId,
  });

  if (linkedExercises.length === 0) {
    return 0;
  }

  const inserted = await insertExercises(linkedExercises);
  return inserted.length;
}

async function persistExtractedGraph(
  ctx: ExtractionContext,
  sanitized: SanitizedExtractionResult,
): Promise<{ exerciseCount: number }> {
  const upsertedKcs = await persistKnowledgeGraph(ctx, sanitized);
  const exerciseCount = await persistExtractedExercises(ctx, sanitized, upsertedKcs);
  return { exerciseCount };
}

async function extractMaterialBatches(
  ctx: ExtractionContext,
): Promise<{ kcCount: number; exerciseCount: number }> {
  const chunks = await getMaterialChunksByMaterialId({ materialId: ctx.materialId });
  if (chunks.length === 0) {
    return { kcCount: 0, exerciseCount: 0 };
  }

  const batches = sliceMaterialChunksIntoBatches(chunks);
  const distinctConceptSlugs = new Set<string>();
  let totalExerciseCount = 0;

  for (const batch of batches) {
    const result = await generateObject({
      model: ctx.model,
      schema: conceptExtractionSchema,
      system: CONCEPT_GRAPH_EXTRACTION_PROMPT,
      prompt: `Extract knowledge concepts, prerequisite dependencies, and practice exercises/problems from the following educational material:\n\n${batch.content}`,
    });

    const sanitized = sanitizeExtractedGraph(result.object);
    for (const c of sanitized.concepts) {
      distinctConceptSlugs.add(c.slug);
    }

    const persistResult = await persistExtractedGraph(ctx, sanitized);
    totalExerciseCount += persistResult.exerciseCount;
  }

  return {
    kcCount: distinctConceptSlugs.size,
    exerciseCount: totalExerciseCount,
  };
}

async function setExtractionStatus(
  material: Material,
  status: 'extracting' | 'ready' | 'failed',
  details: { kcCount?: number; exerciseCount?: number; error?: string } = {},
): Promise<void> {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status };

  if (status === 'extracting') {
    update.startedAt = now;
  } else if (status === 'ready') {
    update.completedAt = now;
    update.kcCount = details.kcCount ?? 0;
    update.exerciseCount = details.exerciseCount ?? 0;
  } else if (status === 'failed') {
    update.completedAt = now;
    update.error = details.error;
  }

  const metadata = updateMaterialGraphExtractionMetadata(
    material.metadata as Record<string, unknown>,
    update,
  );

  await updateMaterialStatus({
    id: material.id,
    status: material.status, // preserve existing material status
    metadata,
  });
}

async function processSingleMaterial(
  ctx: ExtractionContext,
  isFinalAttempt: boolean,
): Promise<{ kcCount: number; exerciseCount: number }> {
  const material = await getMaterialById({
    id: ctx.materialId,
    projectId: ctx.projectId,
    userId: ctx.userId,
  });
  if (!material) {
    return { kcCount: 0, exerciseCount: 0 };
  }

  await setExtractionStatus(material, 'extracting');

  try {
    const counts = await extractMaterialBatches(ctx);
    await setExtractionStatus(material, 'ready', counts);
    return counts;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Concept graph extraction failed';
    if (isFinalAttempt) {
      try {
        await setExtractionStatus(material, 'failed', { error: errorMessage });
      } catch (metaErr) {
        console.error('Failed to record extraction error on material:', metaErr);
      }
    }
    throw err;
  }
}

export async function processGraphExtraction(
  data: ConceptGraphExtractJobData,
  options: ProcessGraphExtractionOptions = {},
): Promise<ProcessGraphExtractionResult> {
  const { projectId, userId, materialIds } = data;
  const model = options.model ?? getLanguageModel({ modelId: 'gemini-3.7-flash' });
  const isFinalAttempt = options.isFinalAttempt ?? true;

  let processedCount = 0;
  let totalKcCount = 0;
  let totalExerciseCount = 0;

  for (const materialId of materialIds) {
    const counts = await processSingleMaterial(
      {
        materialId,
        projectId,
        userId,
        model,
      },
      isFinalAttempt,
    );
    processedCount++;
    totalKcCount += counts.kcCount;
    totalExerciseCount += counts.exerciseCount;
  }

  return {
    processedCount,
    kcCount: totalKcCount,
    exerciseCount: totalExerciseCount,
  };
}

function getJobRetryInfo(job: unknown): { retryCount: number; isFinalAttempt: boolean } {
  const jobRecord = job as Record<string, unknown>;
  const retryCount =
    typeof jobRecord.retryCount === 'number'
      ? jobRecord.retryCount
      : typeof jobRecord.retrycount === 'number'
        ? jobRecord.retrycount
        : 0;
  const retryLimit =
    typeof jobRecord.retryLimit === 'number'
      ? jobRecord.retryLimit
      : typeof jobRecord.retrylimit === 'number'
        ? jobRecord.retrylimit
        : 2;
  return { retryCount, isFinalAttempt: retryCount >= retryLimit };
}

async function handleWorkerJob(job: {
  id: string;
  data: ConceptGraphExtractJobData;
}): Promise<void> {
  const { retryCount, isFinalAttempt } = getJobRetryInfo(job);
  try {
    await processGraphExtraction(job.data, { isFinalAttempt });
  } catch (err) {
    console.error(`Job ${job.id} failed (attempt ${retryCount + 1}):`, err);
    throw err;
  }
}

export async function registerConceptGraphExtractWorker(boss: PgBoss): Promise<void> {
  await boss.work<ConceptGraphExtractJobData>(CONCEPT_GRAPH_EXTRACT_QUEUE, async (jobs) => {
    const jobList = Array.isArray(jobs) ? jobs : [jobs];
    for (const job of jobList) {
      await handleWorkerJob(job);
    }
  });
}
