import { z } from 'zod';
import { requireProjectContext } from '@/lib/auth/project-context';
import { updateProjectName } from '@/lib/db/queries/project';
import { ChatbotError } from '@/lib/errors';
import { deleteProjectLifecycle } from '@/lib/materials';

export const maxDuration = 60;

const updateProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(100, 'Project name too long'),
});

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { project } = await requireProjectContext(params);
    return Response.json({ project }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { project, user } = await requireProjectContext(params);

    const json = await request.json();
    const parsed = updateProjectSchema.safeParse(json);

    if (!parsed.success) {
      return new ChatbotError('bad_request:api', parsed.error.issues[0]?.message).toResponse();
    }

    const updated = await updateProjectName({
      id: project.id,
      userId: user.id,
      name: parsed.data.name,
    });

    return Response.json({ project: updated }, { status: 200 });
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
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { project, user } = await requireProjectContext(params);

    await deleteProjectLifecycle({
      projectId: project.id,
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
