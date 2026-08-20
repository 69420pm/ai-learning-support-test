import { z } from 'zod';
import { createProject, getProjectsWithChatCount } from '@/lib/db/queries/project';
import { ChatbotError } from '@/lib/errors';
import { createClient } from '@/lib/supabase/server';

export const maxDuration = 60;

const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(100, 'Project name too long'),
});

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function GET(_request?: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatbotError('unauthorized:chat').toResponse();
    }

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
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new ChatbotError('unauthorized:chat').toResponse();
    }

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
