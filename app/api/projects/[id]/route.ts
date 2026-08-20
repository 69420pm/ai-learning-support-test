import { z } from 'zod';
import { deleteProjectById, updateProjectName } from '@/lib/db/queries/project';
import { ChatbotError } from '@/lib/errors';
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

    const deleted = await deleteProjectById({
      id,
      userId: user.id,
    });

    if (!deleted) {
      return new ChatbotError('not_found:chat', 'Project not found').toResponse();
    }

    return new Response('Project deleted successfully', { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}
