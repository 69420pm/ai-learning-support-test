import { z } from 'zod';
import { requireProjectContext } from '@/lib/auth/project-context';
import { ChatbotError } from '@/lib/errors';
import { queueGraphExtraction } from '@/lib/materials/concept-extraction';

export const maxDuration = 60;

const extractGraphRequestSchema = z.object({
  materialIds: z.array(z.string().trim().min(1)).min(1).optional(),
  materialId: z.string().trim().min(1).optional(),
});

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { project, user } = await requireProjectContext(params);

    const rawJson = await request.json().catch(() => ({}));
    const parseResult = extractGraphRequestSchema.safeParse(rawJson);
    if (!parseResult.success) {
      return new ChatbotError(
        'bad_request:api',
        parseResult.error.issues[0]?.message ?? 'Invalid request payload',
      ).toResponse();
    }

    const { materialIds, materialId } = parseResult.data;
    const targetMaterialIds = materialIds ?? (materialId ? [materialId] : undefined);

    const result = await queueGraphExtraction({
      projectId: project.id,
      userId: user.id,
      materialIds: targetMaterialIds,
    });

    return Response.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}
