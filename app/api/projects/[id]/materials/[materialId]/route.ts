import { getProjectById } from '@/lib/db/queries/project';
import { ChatbotError } from '@/lib/errors';
import { deleteMaterial, inspectMaterialContent } from '@/lib/materials';
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

    const result = await deleteMaterial({
      materialId,
      projectId,
      userId: user.id,
    });

    return Response.json(
      { success: result.success, materialId: result.materialId },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}
