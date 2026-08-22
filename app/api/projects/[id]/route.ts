import { z } from 'zod';
import { deleteProjectById, getProjectById, updateProjectName } from '@/lib/db/queries/project';
import { ChatbotError } from '@/lib/errors';
import { purgeProjectMaterialsStorage } from '@/lib/materials';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

const updateProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(100, 'Project name too long'),
});

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatbotError('unauthorized:chat').toResponse();
    }

    const json = await request.json();
    const parsed = updateProjectSchema.safeParse(json);

    if (!parsed.success) {
      return new ChatbotError('bad_request:api', parsed.error.issues[0]?.message).toResponse();
    }

    const project = await updateProjectName({
      id,
      userId: user.id,
      name: parsed.data.name,
    });

    return Response.json({ project }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatbotError('unauthorized:chat').toResponse();
    }

    const project = await getProjectById({
      id,
      userId: user.id,
    });

    if (!project) {
      return new ChatbotError('not_found:chat', 'Project not found').toResponse();
    }

    await purgeProjectMaterialsStorage({
      projectId: id,
      userId: user.id,
    });

    await deleteProjectById({
      id,
      userId: user.id,
    });

    return Response.json(
      { success: true, message: 'Project deleted successfully' },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}
