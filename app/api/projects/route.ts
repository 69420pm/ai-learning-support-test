import { z } from 'zod';
import { requireAuthUser } from '@/lib/auth/session';
import { createProject, getProjectsWithChatCount } from '@/lib/db/queries/project';
import { ChatbotError } from '@/lib/errors';

export const maxDuration = 60;

const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(100, 'Project name too long'),
});

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function GET(_request?: Request) {
  try {
    const user = await requireAuthUser();

    const projects = await getProjectsWithChatCount({ userId: user.id });
    return Response.json({ projects }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function POST(request: Request) {
  try {
    const user = await requireAuthUser();

    const json = await request.json();
    const parsed = createProjectSchema.safeParse(json);

    if (!parsed.success) {
      return new ChatbotError('bad_request:api', parsed.error.issues[0]?.message).toResponse();
    }

    const project = await createProject({
      name: parsed.data.name,
      userId: user.id,
    });

    return Response.json({ project }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}
