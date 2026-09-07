import { generateObject, type LanguageModel } from 'ai';
import type { PgBoss } from 'pg-boss';
import { CONCEPT_GRAPH_EXTRACTION_PROMPT } from '@/lib/ai/prompts';
import { getLanguageModel } from '@/lib/ai/providers';
import { insertKnowledgeDependencies, upsertKnowledgeComponents } from '@/lib/db/queries/knowledge';
import {
  getMaterialById,
  getMaterialChunksByMaterialId,
  updateMaterialStatus,
} from '@/lib/db/queries/material';
import type { Material, NewKnowledgeComponent, NewKnowledgeDependency } from '@/lib/db/schema';
import {
  conceptExtractionSchema,
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
};

async function persistExtractedGraph(
  ctx: ExtractionContext,
  sanitized: SanitizedExtractionResult,
): Promise<void> {
  if (sanitized.concepts.length === 0) {
    return;
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
}

async function extractMaterialBatches(ctx: ExtractionContext): Promise<number> {
  const chunks = await getMaterialChunksByMaterialId({ materialId: ctx.materialId });
  if (chunks.length === 0) {
    return 0;
  }

  const batches = sliceMaterialChunksIntoBatches(chunks);
  const distinctConceptSlugs = new Set<string>();

  for (const batch of batches) {
    const result = await generateObject({
      model: ctx.model,
      schema: conceptExtractionSchema,
      system: CONCEPT_GRAPH_EXTRACTION_PROMPT,
      prompt: `Extract knowledge concepts and prerequisite dependencies from the following educational material:\n\n${batch.content}`,
    });

    const sanitized = sanitizeExtractedGraph(result.object);
    for (const c of sanitized.concepts) {
      distinctConceptSlugs.add(c.slug);
    }

    await persistExtractedGraph(ctx, sanitized);
  }

  return distinctConceptSlugs.size;
}

async function setExtractionStatus(
  material: Material,
  status: 'extracting' | 'ready' | 'failed',
  details: { kcCount?: number; error?: string } = {},
): Promise<void> {
  const now = new Date().toISOString();
  const update: Record<string, unknown> = { status };

  if (status === 'extracting') {
    update.startedAt = now;
  } else if (status === 'ready') {
    update.completedAt = now;
    update.kcCount = details.kcCount ?? 0;
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
): Promise<number> {
  const material = await getMaterialById({
    id: ctx.materialId,
    projectId: ctx.projectId,
    userId: ctx.userId,
  });
  if (!material) {
    return 0;
  }

  await setExtractionStatus(material, 'extracting');

  try {
    const kcCount = await extractMaterialBatches(ctx);
    await setExtractionStatus(material, 'ready', { kcCount });
    return kcCount;
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

  for (const materialId of materialIds) {
    const kcCount = await processSingleMaterial(
      {
        materialId,
        projectId,
        userId,
        model,
      },
      isFinalAttempt,
    );
    processedCount++;
    totalKcCount += kcCount;
  }

  return {
    processedCount,
    kcCount: totalKcCount,
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
