import {
  deleteMaterialById,
  getMaterialById,
  getMaterialsByProjectId,
} from '@/lib/db/queries/material';
import type { Material } from '@/lib/db/schema';
import { ChatbotError } from '@/lib/errors';
import { getStorageDriver, type StorageDriver } from '@/lib/storage';

export type DeleteMaterialInput = {
  materialId: string;
  projectId?: string;
  userId?: string;
};

export type DeleteMaterialOptions = {
  storageDriver?: StorageDriver;
};

export type DeleteMaterialResult = {
  success: boolean;
  materialId: string;
  material: Material;
};

export type DeleteProjectLifecycleInput = {
  projectId: string;
  userId?: string;
};

export type DeleteProjectLifecycleOptions = {
  storageDriver?: StorageDriver;
};

export type DeleteProjectLifecycleResult = {
  purgedCount: number;
  totalMaterials: number;
};

/**
 * Consolidated Material Lifecycle domain function.
 * Verifies material existence and ownership scoping, deletes the database record
 * (leveraging PostgreSQL foreign key cascade for chunk records), and purges the
 * physical file from the storage driver. If storage deletion fails (e.g. file already
 * deleted or missing), a non-fatal warning is logged to ensure database deletion completes cleanly.
 */
export async function deleteMaterialLifecycle(
  input: DeleteMaterialInput,
  options?: DeleteMaterialOptions,
): Promise<DeleteMaterialResult> {
  const materialId = input?.materialId?.trim();

  if (!materialId) {
    throw new ChatbotError('bad_request:document', 'A valid material ID is required.');
  }

  // 1. Verify existence of material record
  const material = await getMaterialById({ id: materialId });
  if (!material) {
    throw new ChatbotError('not_found:document', 'Material not found.');
  }

  // 2. Validate ownership scoping if userId or projectId are provided
  if (input.userId && material.userId !== input.userId) {
    throw new ChatbotError('forbidden:document', 'This document belongs to another user.');
  }

  if (input.projectId && material.projectId !== input.projectId) {
    throw new ChatbotError(
      'not_found:document',
      'Material does not belong to the specified project.',
    );
  }

  // 3. Delete database record (chunks cascade automatically via DB foreign key)
  await deleteMaterialById({
    id: materialId,
    projectId: material.projectId,
    userId: material.userId,
  });

  // 4. Purge physical storage blob via storage driver seam
  if (material.storagePath && material.storagePath.trim().length > 0) {
    const storageDriver = options?.storageDriver ?? getStorageDriver();
    try {
      await storageDriver.delete(material.storagePath);
    } catch (storageError) {
      console.error(
        `Failed to delete physical storage blob at "${material.storagePath}" for material "${materialId}":`,
        storageError,
      );
    }
  }

  return {
    success: true,
    materialId: material.id,
    material,
  };
}

/**
 * Consolidated Project Materials storage lifecycle purge domain function.
 * When an entire project is being removed, this function finds all material
 * storage paths associated with that project and purges them from the physical
 * storage driver with non-fatal error handling so failures on individual blobs
 * do not abort the cascade or remaining deletions.
 */
export async function deleteProjectLifecycle(
  input: DeleteProjectLifecycleInput,
  options?: DeleteProjectLifecycleOptions,
): Promise<DeleteProjectLifecycleResult> {
  const projectId = input?.projectId?.trim();

  if (!projectId) {
    throw new ChatbotError('bad_request:document', 'A valid project ID is required.');
  }

  const userId = input.userId?.trim() || undefined;

  // 1. Retrieve all materials belonging to the project (and optionally user)
  const materials = await getMaterialsByProjectId({
    projectId,
    userId,
  });

  if (!materials || materials.length === 0) {
    return {
      purgedCount: 0,
      totalMaterials: 0,
    };
  }

  const storageDriver = options?.storageDriver ?? getStorageDriver();

  // 2. Filter materials that have a valid storage path
  const materialsWithStorage = materials.filter(
    (material) => material.storagePath && material.storagePath.trim().length > 0,
  );

  // 3. Purge physical storage blobs concurrently with non-fatal error handling
  const deletionResults = await Promise.all(
    materialsWithStorage.map(async (material) => {
      try {
        await storageDriver.delete(material.storagePath);
        return true;
      } catch (storageError) {
        console.warn(
          `Failed to purge physical storage blob at "${material.storagePath}" for project "${projectId}" (material "${material.id}"):`,
          storageError,
        );
        return false;
      }
    }),
  );

  const purgedCount = deletionResults.filter(Boolean).length;

  return {
    purgedCount,
    totalMaterials: materials.length,
  };
}
