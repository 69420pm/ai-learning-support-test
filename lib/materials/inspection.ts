import { z } from 'zod';
import { getMaterialById, getMaterialChunksByMaterialId } from '@/lib/db/queries/material';
import type { Material, MaterialChunk } from '@/lib/db/schema';
import { ChatbotError } from '@/lib/errors';

export const inspectMaterialInputSchema = z.object({
  materialId: z.string().trim().min(1, 'A valid material ID is required.'),
  projectId: z.string().trim().min(1, 'A valid project ID is required.'),
  userId: z.string().trim().min(1, 'You need to sign in to view this document.'),
});

export type InspectMaterialInput = z.infer<typeof inspectMaterialInputSchema>;

export type MaterialInspectionResult = {
  material: Material;
  chunks: MaterialChunk[];
  content: string;
};

/**
 * Pure helper function to concatenate chunk contents in ascending index order.
 */
export function synthesizeMaterialContent(chunks: MaterialChunk[]): string {
  if (!chunks || chunks.length === 0) {
    return '';
  }

  return [...chunks]
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((chunk) => chunk.content)
    .join('\n\n');
}

/**
 * Core Material Content inspection domain function.
 * Loads a material record, validates project and user ownership,
 * fetches all associated vector chunks in ascending index order,
 * and synthesizes the concatenated text content for preview and inspection.
 */
export async function inspectMaterialContent(
  input: InspectMaterialInput,
): Promise<MaterialInspectionResult> {
  const parseResult = inspectMaterialInputSchema.safeParse(input);
  if (!parseResult.success) {
    const firstIssue = parseResult.error.issues[0];
    if (firstIssue?.path[0] === 'userId') {
      throw new ChatbotError(
        'unauthorized:document',
        firstIssue.message || 'You need to sign in to view this document.',
      );
    }
    throw new ChatbotError(
      'bad_request:document',
      firstIssue?.message || 'Invalid inspection request parameters.',
    );
  }

  const { materialId, projectId, userId } = parseResult.data;

  // 1. Fetch material record
  const material = await getMaterialById({ id: materialId });

  if (!material) {
    throw new ChatbotError('not_found:document', 'Material not found.');
  }

  // 2. Validate user and project ownership scoping
  if (material.userId !== userId) {
    throw new ChatbotError('forbidden:document', 'This document belongs to another user.');
  }

  if (material.projectId !== projectId) {
    throw new ChatbotError(
      'not_found:document',
      'Material does not belong to the specified project.',
    );
  }

  // 3. Load associated chunks in ascending chunk index order
  const rawChunks = await getMaterialChunksByMaterialId({
    materialId,
  });

  const chunks = [...rawChunks].sort((a, b) => a.chunkIndex - b.chunkIndex);

  // 4. Synthesize full concatenated content
  const content = chunks.map((chunk) => chunk.content).join('\n\n');

  return {
    material,
    chunks,
    content,
  };
}
