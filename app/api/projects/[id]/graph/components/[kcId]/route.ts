import { z } from 'zod';
import { requireProjectContext } from '@/lib/auth/project-context';
import { getKnowledgeComponentDeepInspection } from '@/lib/db/queries/knowledge';
import { ChatbotError } from '@/lib/errors';

export const maxDuration = 60;

export const kcDeepInspectionRouteParamsSchema = z.object({
  id: z.string().trim().min(1, 'Project ID is required'),
  kcId: z.string().trim().min(1, 'Knowledge component ID is required'),
});

export type KcDeepInspectionRouteParams = z.infer<typeof kcDeepInspectionRouteParamsSchema>;

export const kcDeepInspectionResponseSchema = z.object({
  component: z.record(z.string(), z.unknown()),
  exercises: z.array(z.record(z.string(), z.unknown())),
  chunks: z.array(z.record(z.string(), z.unknown())),
});

export type KcDeepInspectionResponse = z.infer<typeof kcDeepInspectionResponseSchema>;

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; kcId: string }> },
): Promise<Response> {
  try {
    const rawParams = await params;
    const parseResult = kcDeepInspectionRouteParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return new ChatbotError(
        'bad_request:api',
        parseResult.error.issues[0]?.message ?? 'Invalid route parameters',
      ).toResponse();
    }

    const { project } = await requireProjectContext(params);
    const { kcId } = parseResult.data;

    const inspection = await getKnowledgeComponentDeepInspection({
      projectId: project.id,
      kcId,
    });
    if (!inspection) {
      return new ChatbotError('not_found:learning', 'Knowledge component not found').toResponse();
    }

    return Response.json(inspection, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}
