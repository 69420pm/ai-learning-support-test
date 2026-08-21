import { getMaterialsByProjectId } from '@/lib/db/queries/material';
import { ChatbotError } from '@/lib/errors';
import { getStorageDriver, type StorageDriver } from '@/lib/storage';

export type PurgeProjectMaterialsInput = {
  projectId: string;
  userId?: string;
};

export type PurgeProjectMaterialsOptions = {
  storageDriver?: StorageDriver;
};

export type PurgeProjectMaterialsResult = {
  purgedCount: number;
  totalMaterials: number;
};

/**
 * Project Materials storage purge domain function.
 * When an entire project is being removed, this function finds all material
 * storage paths associated with that project and purges them from the physical
 * storage driver with non-fatal error handling so failures on individual blobs
 * do not abort the cascade or remaining deletions.
 */
export async function purgeProjectMaterialsStorage(
  input: PurgeProjectMaterialsInput,
  options?: PurgeProjectMaterialsOptions,
): Promise<PurgeProjectMaterialsResult> {
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
