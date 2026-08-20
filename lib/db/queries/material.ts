import { and, asc, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  type Material,
  type MaterialChunk,
  type MaterialStatus,
  materialChunks,
  materials,
  type NewMaterial,
  type NewMaterialChunk,
} from '@/lib/db/schema';
import { ChatbotError } from '@/lib/errors';

export type CreateMaterialParams = {
  projectId: string;
  userId: string;
  title: string;
  filename: string;
  fileType: string;
  fileSize?: number;
  storagePath: string;
  metadata?: Record<string, unknown>;
};

export async function createMaterial({
  projectId,
  userId,
  title,
  filename,
  fileType,
  fileSize = 0,
  storagePath,
  metadata = {},
}: CreateMaterialParams): Promise<Material> {
  try {
    const [inserted] = await db
      .insert(materials)
      .values({
        projectId,
        userId,
        title: title.trim(),
        filename: filename.trim(),
        fileType,
        fileSize,
        storagePath,
        status: 'pending',
        metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return inserted;
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getMaterialsByProjectId({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<Material[]> {
  try {
    return await db
      .select()
      .from(materials)
      .where(and(eq(materials.projectId, projectId), eq(materials.userId, userId)))
      .orderBy(desc(materials.createdAt));
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getMaterialById({
  id,
  projectId,
  userId,
}: {
  id: string;
  projectId?: string;
  userId?: string;
}): Promise<Material | null> {
  try {
    const conditions = [eq(materials.id, id)];
    if (projectId) {
      conditions.push(eq(materials.projectId, projectId));
    }
    if (userId) {
      conditions.push(eq(materials.userId, userId));
    }

    const [material] = await db
      .select()
      .from(materials)
      .where(and(...conditions));

    return material ?? null;
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function updateMaterialStatus({
  id,
  status,
  errorMessage = null,
  metadata,
}: {
  id: string;
  status: MaterialStatus;
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<Material> {
  try {
    const updateValues: Partial<NewMaterial> = {
      status,
      errorMessage,
      updatedAt: new Date(),
    };

    if (metadata !== undefined) {
      updateValues.metadata = metadata;
    }

    const [updated] = await db
      .update(materials)
      .set(updateValues)
      .where(eq(materials.id, id))
      .returning();

    if (!updated) {
      throw new ChatbotError('not_found:database', `Material with id ${id} not found`);
    }

    return updated;
  } catch (error) {
    if (error instanceof ChatbotError) throw error;
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function deleteMaterialById({
  id,
  projectId,
  userId,
}: {
  id: string;
  projectId?: string;
  userId: string;
}): Promise<Material | null> {
  try {
    const conditions = [eq(materials.id, id), eq(materials.userId, userId)];
    if (projectId) {
      conditions.push(eq(materials.projectId, projectId));
    }

    const [deleted] = await db
      .delete(materials)
      .where(and(...conditions))
      .returning();

    return deleted ?? null;
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function insertMaterialChunks(chunks: NewMaterialChunk[]): Promise<MaterialChunk[]> {
  if (chunks.length === 0) {
    return [];
  }

  try {
    return await db.insert(materialChunks).values(chunks).returning();
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function getMaterialChunksByMaterialId({
  materialId,
}: {
  materialId: string;
}): Promise<MaterialChunk[]> {
  try {
    return await db
      .select()
      .from(materialChunks)
      .where(eq(materialChunks.materialId, materialId))
      .orderBy(asc(materialChunks.chunkIndex));
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}

export async function deleteMaterialChunksByMaterialId({
  materialId,
}: {
  materialId: string;
}): Promise<void> {
  try {
    await db.delete(materialChunks).where(eq(materialChunks.materialId, materialId));
  } catch (error) {
    throw new ChatbotError('bad_request:database', { cause: error });
  }
}
