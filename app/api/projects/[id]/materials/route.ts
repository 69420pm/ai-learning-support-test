import { z } from 'zod';
import { requireProjectContext } from '@/lib/auth/project-context';
import { getMaterialsByProjectId } from '@/lib/db/queries/material';
import { ChatbotError } from '@/lib/errors';
import { intakeMaterial } from '@/lib/materials';

export const maxDuration = 60;

const materialUploadSchema = z.object({
  title: z.string().trim().min(1).optional(),
});

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { project, user } = await requireProjectContext(params);

    const materials = await getMaterialsByProjectId({ projectId: project.id, userId: user.id });
    return Response.json({ materials }, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { project, user } = await requireProjectContext(params);

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return new ChatbotError('bad_request:api', 'A valid file is required').toResponse();
    }

    const titleParam = formData.get('title');
    const parsedFields = materialUploadSchema.safeParse({
      title: typeof titleParam === 'string' && titleParam.trim() ? titleParam.trim() : undefined,
    });

    const title = parsedFields.success ? parsedFields.data.title : undefined;

    const material = await intakeMaterial({
      projectId: project.id,
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
