import { requireAuthUser } from '@/lib/auth/session';
import { getMaterialsByProjectId } from '@/lib/db/queries/material';
import { getProjectById } from '@/lib/db/queries/project';
import { ChatbotError } from '@/lib/errors';
import { intakeMaterial } from '@/lib/materials';

export const maxDuration = 60;

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthUser();

    const project = await getProjectById({ id: projectId, userId: user.id });
    if (!project) {
      return new ChatbotError('not_found:chat', 'Project not found').toResponse();
    }

    const materials = await getMaterialsByProjectId({ projectId, userId: user.id });
    return Response.json({ materials }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params;
    const user = await requireAuthUser();

    const project = await getProjectById({ id: projectId, userId: user.id });
    if (!project) {
      return new ChatbotError('not_found:chat', 'Project not found').toResponse();
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new ChatbotError('bad_request:api', 'A valid file is required').toResponse();
    }

    const titleParam = formData.get('title');
    const title =
      typeof titleParam === 'string' && titleParam.trim() ? titleParam.trim() : undefined;

    const material = await intakeMaterial({
      projectId,
      userId: user.id,
      file,
      title,
    });

    return Response.json({ material }, { status: 201 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}
