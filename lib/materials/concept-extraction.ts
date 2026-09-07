import { z } from 'zod';
import { getMaterialsByProjectId, updateMaterialStatus } from '@/lib/db/queries/material';
import type { MaterialChunk } from '@/lib/db/schema';
import { PACER_CATEGORIES, type PacerCategory } from '@/lib/db/schema/knowledge';
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
});

export type RawConcept = z.infer<typeof conceptExtractionSchema>['concepts'][number];
export type RawPrerequisite = z.infer<typeof conceptExtractionSchema>['prerequisites'][number];
export type RawExtractionResult = z.infer<typeof conceptExtractionSchema>;

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

export type SanitizedExtractionResult = {
  concepts: SanitizedConcept[];
  prerequisites: SanitizedPrerequisite[];
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

export function sanitizeExtractedGraph(raw: RawExtractionResult): SanitizedExtractionResult {
  const concepts = sanitizeConcepts(raw.concepts);
  const validSlugs = new Set(concepts.map((c) => c.slug));
  const prerequisites = sanitizePrerequisites(raw.prerequisites, validSlugs);

  return {
    concepts,
    prerequisites,
  };
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

export function isMaterialExtractingGraph(metadata?: Record<string, unknown> | null): boolean {
  const graphExtraction = metadata?.graphExtraction as MaterialGraphExtractionMetadata | undefined;
  return graphExtraction?.status === 'queued' || graphExtraction?.status === 'extracting';
}

export type QueueGraphExtractionParams = {
  projectId: string;
  userId: string;
  materialIds?: string[];
};

export type QueueGraphExtractionResult = {
  enqueued: boolean;
  materialCount: number;
  jobId: string;
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
    throw new ChatbotError('bad_request:api', 'Failed to queue graph extraction job.');
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
