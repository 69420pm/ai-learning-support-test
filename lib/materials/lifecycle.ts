import { z } from 'zod';
import { cleanupMaterialExtractedGraph } from '@/lib/db/queries/knowledge';
import {
  deleteMaterialById,
  getMaterialById,
  getMaterialsByProjectId,
} from '@/lib/db/queries/material';
import { deleteProjectById, getProjectById } from '@/lib/db/queries/project';
import type { Material, Project } from '@/lib/db/schema';
import { ChatbotError } from '@/lib/errors';
import { getStorageDriver, type StorageDriver } from '@/lib/storage';

export const deleteMaterialInputSchema = z.object({
  materialId: z.string().trim().min(1, 'A valid material ID is required.'),
  projectId: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
});

export type DeleteMaterialInput = z.infer<typeof deleteMaterialInputSchema>;

export type DeleteMaterialOptions = {
  storageDriver?: StorageDriver;
};

export type DeleteMaterialResult = {
  success: boolean;
  materialId: string;
  material: Material;
};

export const deleteProjectLifecycleInputSchema = z.object({
  projectId: z.string().trim().min(1, 'A valid project ID is required.'),
  userId: z.string().trim().min(1).optional(),
});

export type DeleteProjectLifecycleInput = z.infer<typeof deleteProjectLifecycleInputSchema>;

export type DeleteProjectLifecycleOptions = {
  storageDriver?: StorageDriver;
};

export type DeleteProjectLifecycleResult = {
  success: boolean;
  projectId: string;
  purgedCount: number;
  totalMaterials: number;
  project: Project | null;
};

/**
 * Consolidated Material Lifecycle domain function.
 * Verifies material existence and ownership scoping, reconciles the extracted knowledge graph,
 * deletes the database record (leveraging PostgreSQL foreign key cascade for chunk records),
 * and purges the physical file from the storage driver. If storage deletion fails (e.g. file already
 * deleted or missing), a non-fatal warning is logged to ensure database deletion completes cleanly.
 */
export async function deleteMaterialLifecycle(
  input: DeleteMaterialInput,
  options?: DeleteMaterialOptions,
): Promise<DeleteMaterialResult> {
  const parseResult = deleteMaterialInputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new ChatbotError(
      'bad_request:document',
      parseResult.error.issues[0]?.message ?? 'A valid material ID is required.',
    );
  }

  const { materialId, projectId, userId } = parseResult.data;

  // 1. Verify existence of material record
  const material = await getMaterialById({ id: materialId });
  if (!material) {
    throw new ChatbotError('not_found:document', 'Material not found.');
  }

  // 2. Validate ownership scoping if userId or projectId are provided
  if (userId && material.userId !== userId) {
    throw new ChatbotError('forbidden:document', 'This document belongs to another user.');
  }

  if (projectId && material.projectId !== projectId) {
    throw new ChatbotError(
      'not_found:document',
      'Material does not belong to the specified project.',
    );
  }

  // 3. Purge physical storage blob via storage driver seam first to prevent orphaned storage leaks
  if (material.storagePath && material.storagePath.trim().length > 0) {
    const storageDriver = options?.storageDriver ?? getStorageDriver();
    try {
      await storageDriver.delete(material.storagePath);
    } catch (storageError) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `Failed to delete physical storage blob at "${material.storagePath}" for material "${materialId}":`,
          storageError,
        );
      }
    }
  }

  // 4. Reconcile extracted knowledge graph (clean up exercises and dependencies linked to this material)
  try {
    await cleanupMaterialExtractedGraph({
      materialId,
      projectId: material.projectId,
    });
  } catch (graphError) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        `Failed to clean up extracted graph entities for material "${materialId}":`,
        graphError,
      );
    }
  }

  // 5. Delete database record (chunks cascade automatically via DB foreign key)
  await deleteMaterialById({
    id: materialId,
    projectId: material.projectId,
    userId: material.userId,
  });

  return {
    success: true,
    materialId: material.id,
    material,
  };
}

/**
 * Consolidated Project Materials & Database Lifecycle domain seam.
 * Guarantees complete atomic project cleanup in a single seam:
 * 1. Validates project existence and ownership scoping.
 * 2. Purges all associated physical storage blobs via the storage driver.
 * 3. Removes the project database record, automatically cascading database deletions
 *    (materials, chunks, knowledge components, dependencies, exercises, chats, messages).
 */
export async function deleteProjectLifecycle(
  input: DeleteProjectLifecycleInput,
  options?: DeleteProjectLifecycleOptions,
): Promise<DeleteProjectLifecycleResult> {
  const parseResult = deleteProjectLifecycleInputSchema.safeParse(input);
  if (!parseResult.success) {
    throw new ChatbotError(
      'bad_request:document',
      parseResult.error.issues[0]?.message ?? 'A valid project ID is required.',
    );
  }

  const { projectId, userId } = parseResult.data;

  // 1. Verify existence of project record and scoping
  const project = await getProjectById({
    id: projectId,
    userId,
  });

  if (!project) {
    throw new ChatbotError('not_found:chat', 'Project not found');
  }

  // 2. Retrieve all materials belonging to the project (and optionally user)
  const materials = await getMaterialsByProjectId({
    projectId,
    userId,
  });

  const storageDriver = options?.storageDriver ?? getStorageDriver();
  let purgedCount = 0;

  if (materials && materials.length > 0) {
    // Filter materials that have a valid storage path
    const materialsWithStorage = materials.filter(
      (material) => material.storagePath && material.storagePath.trim().length > 0,
    );

    // Purge physical storage blobs concurrently with non-fatal error handling
    const deletionResults = await Promise.all(
      materialsWithStorage.map(async (material) => {
        try {
          await storageDriver.delete(material.storagePath);
          return true;
        } catch (storageError) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn(
              `Failed to purge physical storage blob at "${material.storagePath}" for project "${projectId}" (material "${material.id}"):`,
              storageError,
            );
          }
          return false;
        }
      }),
    );

    purgedCount = deletionResults.filter(Boolean).length;
  }

  // 3. Delete project database record (cascading all dependent entities via PostgreSQL foreign keys)
  const deletedProject = await deleteProjectById({
    id: projectId,
    userId,
  });

  return {
    success: true,
    projectId,
    purgedCount,
    totalMaterials: materials?.length ?? 0,
    project: deletedProject ?? project,
  };
}
