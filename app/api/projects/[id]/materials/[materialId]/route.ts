import { z } from 'zod';
import { requireProjectContext } from '@/lib/auth/project-context';
import { ChatbotError } from '@/lib/errors';
import { deleteMaterialLifecycle, inspectMaterialContent } from '@/lib/materials';

export const maxDuration = 60;

const materialRouteParamsSchema = z.object({
  id: z.string().trim().min(1, 'A valid project ID is required'),
  materialId: z.string().trim().min(1, 'A valid material ID is required'),
});

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; materialId: string }> },
): Promise<Response> {
  try {
    const rawParams = await params;
    const parseResult = materialRouteParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return new ChatbotError(
        'bad_request:api',
        parseResult.error.issues[0]?.message ?? 'Invalid route parameters',
      ).toResponse();
    }

    const { materialId } = parseResult.data;
    const { project, user } = await requireProjectContext(rawParams);

    const { material, chunks, content } = await inspectMaterialContent({
      materialId,
      projectId: project.id,
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
): Promise<Response> {
  try {
    const rawParams = await params;
    const parseResult = materialRouteParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return new ChatbotError(
        'bad_request:api',
        parseResult.error.issues[0]?.message ?? 'Invalid route parameters',
      ).toResponse();
    }

    const { materialId } = parseResult.data;
    const { project, user } = await requireProjectContext(rawParams);

    const result = await deleteMaterialLifecycle({
      materialId,
      projectId: project.id,
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
