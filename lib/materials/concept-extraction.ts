import { generateObject, type LanguageModel } from 'ai';
import { z } from 'zod';
import { buildConceptExtractionPrompt, CONCEPT_GRAPH_EXTRACTION_PROMPT } from '@/lib/ai/prompts';
import { getLanguageModel } from '@/lib/ai/providers';
import {
  cleanupMaterialExtractedGraph,
  getActiveProjectConceptNames,
  getKnowledgeComponentsByProjectId,
  insertExercises,
  insertKnowledgeDependencies,
  upsertKnowledgeComponents,
} from '@/lib/db/queries/knowledge';
import {
  getMaterialById,
  getMaterialChunksByMaterialId,
  getMaterialsByProjectId,
  updateMaterialStatus,
} from '@/lib/db/queries/material';
import type {
  KnowledgeComponent,
  Material,
  MaterialChunk,
  NewKnowledgeComponent,
  NewKnowledgeDependency,
} from '@/lib/db/schema';
import {
  EXERCISE_QUESTION_TYPES,
  type ExerciseQuestionType,
  type NewExercise,
  PACER_CATEGORIES,
  type PacerCategory,
} from '@/lib/db/schema/knowledge';
import { ChatbotError } from '@/lib/errors';
import { sendConceptGraphExtractJob } from '@/lib/queue/boss';
import type { MaterialGraphExtractionMetadata } from './types';

export function slugifyConceptName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const exerciseExtractionSchema = z.object({
  pageNumber: z.number().int().describe('Page number in source material where exercise appears'),
  title: z.string().optional().describe('Label or title, e.g. "Problem 3.1"'),
  prompt: z
    .string()
    .optional()
    .describe('Text/LaTeX transcription of problem statement if applicable'),
  solution: z
    .string()
    .nullable()
    .optional()
    .describe('Answer or solution if explicitly stated in text; omit if unsolved'),
  questionType: z.enum(EXERCISE_QUESTION_TYPES),
  difficulty: z.number().int().min(1).max(5).default(1),
  targetConceptName: z.string().describe('Concept name that this exercise primarily tests'),
});

export const conceptExtractionSchema = z.object({
  concepts: z.array(
    z.object({
      name: z.string().trim().min(1, 'Concept name is required'),
      pacerCategory: z.enum(PACER_CATEGORIES, {
        message:
          "PACER category must be one of: 'procedural', 'analogous', 'conceptual', 'evidence', 'reference'",
      }),
      bloomLevel: z
        .number()
        .int()
        .min(1, 'Bloom level must be at least 1')
        .max(6, 'Bloom level cannot exceed 6'),
      aliases: z.array(z.string().trim()).default([]),
    }),
  ),
  prerequisites: z.array(
    z.object({
      sourceName: z.string().trim().min(1, 'Prerequisite source concept name is required'),
      targetName: z.string().trim().min(1, 'Prerequisite target concept name is required'),
      relationshipType: z.string().trim().default('prerequisite'),
      reasoning: z.string().trim().optional(),
    }),
  ),
  exercises: z.array(exerciseExtractionSchema).default([]),
});

export type RawConcept = z.infer<typeof conceptExtractionSchema>['concepts'][number];
export type RawPrerequisite = z.infer<typeof conceptExtractionSchema>['prerequisites'][number];
export type RawExercise = z.infer<typeof conceptExtractionSchema>['exercises'][number];

export type SanitizedConcept = {
  name: string;
  slug: string;
  pacerCategory: PacerCategory;
  bloomLevel: number;
  aliases: string[];
};

export type SanitizedPrerequisite = {
  sourceName: string;
  targetName: string;
  sourceSlug: string;
  targetSlug: string;
  relationshipType: string;
  reasoning?: string;
};

export type SanitizedExercise = {
  pageNumber: number;
  title?: string;
  prompt?: string;
  solution?: string | null;
  questionType: ExerciseQuestionType;
  difficulty: number;
  targetConceptName: string;
  targetConceptSlug: string;
};

export type SanitizedExtractionResult = {
  concepts: SanitizedConcept[];
  prerequisites: SanitizedPrerequisite[];
  exercises: SanitizedExercise[];
};

function sanitizeConcepts(rawConcepts: RawConcept[]): SanitizedConcept[] {
  const conceptMapBySlug = new Map<string, SanitizedConcept>();

  for (const c of rawConcepts) {
    const slug = slugifyConceptName(c.name);
    if (!slug) continue;

    const existing = conceptMapBySlug.get(slug);
    if (existing) {
      existing.aliases = Array.from(new Set([...existing.aliases, ...c.aliases]));
    } else {
      conceptMapBySlug.set(slug, {
        name: c.name.trim(),
        slug,
        pacerCategory: c.pacerCategory,
        bloomLevel: c.bloomLevel,
        aliases: [...new Set(c.aliases.map((a) => a.trim()).filter(Boolean))],
      });
    }
  }

  return Array.from(conceptMapBySlug.values());
}

function sanitizePrerequisites(
  rawPrerequisites: RawPrerequisite[],
  validSlugs: Set<string>,
): SanitizedPrerequisite[] {
  const validPrerequisites: SanitizedPrerequisite[] = [];
  const seenPrereqKeys = new Set<string>();

  for (const p of rawPrerequisites) {
    const sourceSlug = slugifyConceptName(p.sourceName);
    const targetSlug = slugifyConceptName(p.targetName);

    if (!sourceSlug || !targetSlug || sourceSlug === targetSlug) {
      continue;
    }

    if (!validSlugs.has(sourceSlug) || !validSlugs.has(targetSlug)) {
      continue;
    }

    const relationshipType = p.relationshipType || 'prerequisite';
    const key = `${sourceSlug}->${targetSlug}:${relationshipType}`;

    if (seenPrereqKeys.has(key)) {
      continue;
    }

    seenPrereqKeys.add(key);
    validPrerequisites.push({
      sourceName: p.sourceName.trim(),
      targetName: p.targetName.trim(),
      sourceSlug,
      targetSlug,
      relationshipType,
      reasoning: p.reasoning?.trim(),
    });
  }

  return validPrerequisites;
}

function sanitizeExercises(rawExercises: RawExercise[] = []): SanitizedExercise[] {
  const validExercises: SanitizedExercise[] = [];

  for (const e of rawExercises) {
    const targetConceptName = e.targetConceptName?.trim();
    if (!targetConceptName) continue;
    const targetConceptSlug = slugifyConceptName(targetConceptName);
    if (!targetConceptSlug) continue;

    const solution =
      e.solution === null
        ? null
        : typeof e.solution === 'string' && e.solution.trim().length > 0
          ? e.solution.trim()
          : null;

    validExercises.push({
      pageNumber: e.pageNumber,
      title: e.title?.trim() || undefined,
      prompt: e.prompt?.trim() || undefined,
      solution,
      questionType: e.questionType,
      difficulty: e.difficulty ?? 1,
      targetConceptName,
      targetConceptSlug,
    });
  }

  return validExercises;
}

export function sanitizeExtractedGraph(raw: {
  concepts: RawConcept[];
  prerequisites: RawPrerequisite[];
  exercises?: RawExercise[];
}): SanitizedExtractionResult {
  const concepts = sanitizeConcepts(raw.concepts);
  const validSlugs = new Set(concepts.map((c) => c.slug));
  const prerequisites = sanitizePrerequisites(raw.prerequisites, validSlugs);
  const exercises = sanitizeExercises(raw.exercises ?? []);

  return {
    concepts,
    prerequisites,
    exercises,
  };
}

export type KcIdentifier = {
  id: string;
  name: string;
  slug: string;
};

export type LinkExercisesToKcsParams = {
  exercises: SanitizedExercise[];
  availableKcs: KcIdentifier[];
  projectId: string;
  userId: string;
  materialId: string;
};

export function linkExercisesToKcs({
  exercises,
  availableKcs,
  projectId,
  userId,
  materialId,
}: LinkExercisesToKcsParams): NewExercise[] {
  if (!exercises || exercises.length === 0 || !availableKcs || availableKcs.length === 0) {
    return [];
  }

  const kcBySlug = new Map<string, string>();
  const kcByName = new Map<string, string>();

  for (const kc of availableKcs) {
    kcBySlug.set(kc.slug, kc.id);
    kcByName.set(kc.name.trim().toLowerCase(), kc.id);
  }

  const linkedExercises: NewExercise[] = [];

  for (const ex of exercises) {
    const kcId =
      kcBySlug.get(ex.targetConceptSlug) ??
      kcBySlug.get(slugifyConceptName(ex.targetConceptName)) ??
      kcByName.get(ex.targetConceptName.trim().toLowerCase());

    if (!kcId) {
      continue;
    }

    linkedExercises.push({
      projectId,
      userId,
      materialId,
      kcId,
      pageNumber: ex.pageNumber,
      title: ex.title,
      prompt: ex.prompt,
      solution: ex.solution ?? null,
      questionType: ex.questionType,
      difficulty: ex.difficulty,
    });
  }

  return linkedExercises;
}

export type BatchOptions = {
  minTokens?: number;
  maxTokens?: number;
};

export type ContentBatch = {
  batchIndex: number;
  content: string;
  tokenCount: number;
  chunkIndices: number[];
};

export function sliceMaterialChunksIntoBatches(
  chunks: MaterialChunk[],
  options: BatchOptions = {},
): ContentBatch[] {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const { minTokens = 16000, maxTokens = 32000 } = options;

  const sortedChunks = [...chunks].sort((a, b) => a.chunkIndex - b.chunkIndex);
  const batches: ContentBatch[] = [];

  let currentBatchChunks: MaterialChunk[] = [];
  let currentBatchTokens = 0;
  let previousPageNumber: number | undefined;

  for (const chunk of sortedChunks) {
    const chunkTokens = chunk.tokenCount || Math.ceil(chunk.content.length / 4);
    const chunkPage =
      typeof chunk.metadata === 'object' &&
      chunk.metadata !== null &&
      'pageNumber' in chunk.metadata
        ? (chunk.metadata.pageNumber as number | undefined)
        : undefined;

    const startsWithMajorHeading = /^(?:#{1,2}\s+)/m.test(chunk.content.trim());
    const isPageChange =
      previousPageNumber !== undefined &&
      chunkPage !== undefined &&
      chunkPage !== previousPageNumber;

    const hasReachedMin = currentBatchTokens >= minTokens;
    const isNaturalBoundary = startsWithMajorHeading || isPageChange;
    const wouldExceedMax = currentBatchTokens + chunkTokens > maxTokens;

    if (currentBatchChunks.length > 0 && ((hasReachedMin && isNaturalBoundary) || wouldExceedMax)) {
      batches.push(createContentBatch(currentBatchChunks, batches.length, currentBatchTokens));
      currentBatchChunks = [];
      currentBatchTokens = 0;
    }

    currentBatchChunks.push(chunk);
    currentBatchTokens += chunkTokens;
    previousPageNumber = chunkPage;
  }

  if (currentBatchChunks.length > 0) {
    batches.push(createContentBatch(currentBatchChunks, batches.length, currentBatchTokens));
  }

  return batches;
}

function createContentBatch(
  chunks: MaterialChunk[],
  batchIndex: number,
  tokenCount: number,
): ContentBatch {
  return {
    batchIndex,
    content: chunks.map((c) => c.content).join('\n\n'),
    tokenCount,
    chunkIndices: chunks.map((c) => c.chunkIndex),
  };
}

export function updateMaterialGraphExtractionMetadata(
  currentMetadata: Record<string, unknown> | null | undefined,
  update: Partial<MaterialGraphExtractionMetadata>,
): Record<string, unknown> {
  const base = (currentMetadata ?? {}) as Record<string, unknown>;
  const graphExtraction = (base.graphExtraction ?? {}) as Record<string, unknown>;

  return {
    ...base,
    graphExtraction: {
      ...graphExtraction,
      ...update,
    },
  };
}

export { isMaterialExtractingGraph } from './types';

export type QueueGraphExtractionParams = {
  projectId: string;
  userId: string;
  materialIds?: string[];
};

export type QueueGraphExtractionResult = {
  enqueued: boolean;
  materialCount: number;
  jobId: string | null;
};

export async function queueGraphExtraction({
  projectId,
  userId,
  materialIds,
}: QueueGraphExtractionParams): Promise<QueueGraphExtractionResult> {
  const projectMaterials = await getMaterialsByProjectId({
    projectId,
    userId,
  });

  let targetIds: string[];

  if (materialIds && materialIds.length > 0) {
    const projectMaterialMap = new Map(projectMaterials.map((m) => [m.id, m]));
    targetIds = materialIds.filter((id) => projectMaterialMap.has(id));

    if (targetIds.length === 0) {
      throw new ChatbotError(
        'bad_request:api',
        'None of the specified materials belong to this project.',
      );
    }
  } else {
    targetIds = projectMaterials.filter((m) => m.status === 'ready').map((m) => m.id);

    if (targetIds.length === 0) {
      throw new ChatbotError(
        'bad_request:api',
        'No ready materials available in this project for extraction.',
      );
    }
  }

  const jobId = await sendConceptGraphExtractJob({
    projectId,
    userId,
    materialIds: targetIds,
  });

  if (!jobId) {
    // Debounced by pg-boss singletonKey because an extraction job for this project is already active or queued
    return {
      enqueued: false,
      materialCount: targetIds.length,
      jobId: null,
    };
  }

  const projectMaterialMap = new Map(projectMaterials.map((m) => [m.id, m]));
  for (const materialId of targetIds) {
    const material = projectMaterialMap.get(materialId);
    if (!material) continue;

    const metadata = updateMaterialGraphExtractionMetadata(
      material.metadata as Record<string, unknown>,
      { status: 'queued', jobId },
    );

    await updateMaterialStatus({
      id: materialId,
      status: material.status,
      metadata,
    });
  }

  return {
    enqueued: true,
    materialCount: targetIds.length,
    jobId,
  };
}

export type ExtractionContext = {
  materialId: string;
  projectId: string;
  userId: string;
  model: LanguageModel;
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

  const existingVocabulary = await getActiveProjectConceptNames({
    projectId: ctx.projectId,
    limit: 500,
  });

  const batches = sliceMaterialChunksIntoBatches(chunks);
  const distinctConceptSlugs = new Set<string>();
  let totalExerciseCount = 0;

  for (const batch of batches) {
    const prompt = buildConceptExtractionPrompt({
      content: batch.content,
      existingVocabulary,
    });

    const result = await generateObject({
      model: ctx.model,
      schema: conceptExtractionSchema,
      system: CONCEPT_GRAPH_EXTRACTION_PROMPT,
      prompt,
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
    status: material.status,
    metadata,
  });
}

export const extractConceptGraphInputSchema = z.union([
  z.string().trim().min(1, 'A valid material ID is required.'),
  z.object({
    materialId: z.string().trim().min(1, 'A valid material ID is required.'),
    projectId: z.string().trim().min(1).optional(),
    userId: z.string().trim().min(1).optional(),
  }),
]);

export type ExtractConceptGraphInput = z.infer<typeof extractConceptGraphInputSchema>;

export type ExtractConceptGraphOptions = {
  projectId?: string;
  userId?: string;
  model?: LanguageModel;
  isFinalAttempt?: boolean;
};

export type ExtractConceptGraphResult = {
  materialId: string;
  kcCount: number;
  exerciseCount: number;
};

function resolveExtractionInput(
  data: z.infer<typeof extractConceptGraphInputSchema>,
  options: ExtractConceptGraphOptions,
) {
  if (typeof data === 'string') {
    return {
      materialId: data,
      projectId: options.projectId,
      userId: options.userId,
    };
  }
  return {
    materialId: data.materialId,
    projectId: data.projectId ?? options.projectId,
    userId: data.userId ?? options.userId,
  };
}

async function recordExtractionFailure(
  material: Material,
  err: unknown,
  isFinalAttempt: boolean,
): Promise<void> {
  if (!isFinalAttempt) return;
  const errorMessage = err instanceof Error ? err.message : 'Concept graph extraction failed';
  try {
    await setExtractionStatus(material, 'failed', { error: errorMessage });
  } catch (metaErr) {
    console.error('Failed to record extraction error on material:', metaErr);
  }
}

/**
 * Deep, transport-agnostic concept graph extraction engine seam.
 * Can be executed synchronously by tests or CLI scripts, or delegated from background workers.
 * Manages chunk batching, vision/LLM extraction, sanitization, and atomic graph persistence.
 */
export async function extractConceptGraph(
  materialIdOrInput: ExtractConceptGraphInput,
  options: ExtractConceptGraphOptions = {},
): Promise<ExtractConceptGraphResult> {
  const parseResult = extractConceptGraphInputSchema.safeParse(materialIdOrInput);
  if (!parseResult.success) {
    throw new ChatbotError(
      'bad_request:document',
      parseResult.error.issues[0]?.message ?? 'A valid material ID is required.',
    );
  }

  const { materialId, projectId, userId } = resolveExtractionInput(parseResult.data, options);
  const model = options.model ?? getLanguageModel({ modelId: 'gemini-3.7-flash' });
  const isFinalAttempt = options.isFinalAttempt ?? true;

  const material = await getMaterialById({
    id: materialId,
    projectId,
    userId,
  });

  if (!material) {
    return { materialId, kcCount: 0, exerciseCount: 0 };
  }

  const ctx: ExtractionContext = {
    materialId,
    projectId: material.projectId,
    userId: material.userId,
    model,
  };

  await setExtractionStatus(material, 'extracting');

  await cleanupMaterialExtractedGraph({
    materialId: ctx.materialId,
    projectId: ctx.projectId,
  });

  try {
    const counts = await extractMaterialBatches(ctx);
    await setExtractionStatus(material, 'ready', counts);
    return {
      materialId,
      kcCount: counts.kcCount,
      exerciseCount: counts.exerciseCount,
    };
  } catch (err) {
    await recordExtractionFailure(material, err, isFinalAttempt);
    throw err;
  }
}
