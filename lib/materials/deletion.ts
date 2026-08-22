import { deleteMaterialById, getMaterialById } from '@/lib/db/queries/material';
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

/**
 * Core Material Deletion domain function.
 * Verifies material existence and ownership scoping, deletes the database record
 * (leveraging PostgreSQL foreign key cascade for chunk records), and purges the
 * physical file from the storage driver. If storage deletion fails (e.g. file already
 * deleted or missing), a non-fatal warning is logged to ensure database deletion completes cleanly.
 */
export async function deleteMaterial(
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
