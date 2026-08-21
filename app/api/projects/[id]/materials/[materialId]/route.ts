import {
  deleteMaterialById,
  deleteMaterialChunksByMaterialId,
  getMaterialById,
} from '@/lib/db/queries/material';
import { getProjectById } from '@/lib/db/queries/project';
import { ChatbotError } from '@/lib/errors';
import { inspectMaterialContent } from '@/lib/materials';
import { getStorageDriver } from '@/lib/storage';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> },
) {
  try {
    const { id: projectId, materialId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatbotError('unauthorized:chat').toResponse();
    }

    const project = await getProjectById({ id: projectId, userId: user.id });
    if (!project) {
      return new ChatbotError('not_found:chat', 'Project not found').toResponse();
    }

    const { material, chunks, content } = await inspectMaterialContent({
      materialId,
      projectId,
      userId: user.id,
    });

    return Response.json({ material, chunks, content }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> },
) {
  try {
    const { id: projectId, materialId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatbotError('unauthorized:chat').toResponse();
    }

    const project = await getProjectById({ id: projectId, userId: user.id });
    if (!project) {
      return new ChatbotError('not_found:chat', 'Project not found').toResponse();
    }

    const material = await getMaterialById({ id: materialId, projectId, userId: user.id });
    if (!material) {
      return new ChatbotError('not_found:document', 'Material not found').toResponse();
    }

    // 1. Delete associated chunks
    await deleteMaterialChunksByMaterialId({ materialId });

    // 2. Delete database record
    await deleteMaterialById({ id: materialId, projectId, userId: user.id });

    // 3. Delete physical storage blob
    try {
      const storageDriver = getStorageDriver();
      await storageDriver.delete(material.storagePath);
    } catch (storageError) {
      console.error(
        `Failed to delete physical storage blob at ${material.storagePath}:`,
        storageError,
      );
    }

    return Response.json({ success: true, materialId }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}
