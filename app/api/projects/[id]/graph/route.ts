import { z } from 'zod';
import { requireAuthUser } from '@/lib/auth/session';
import { getProjectGraphData } from '@/lib/db/queries/knowledge';
import { getProjectById } from '@/lib/db/queries/project';
import { ChatbotError } from '@/lib/errors';

export const maxDuration = 60;

export const graphRouteParamsSchema = z.object({
  id: z.string().trim().min(1, 'Project ID is required'),
});

export type GraphRouteParams = z.infer<typeof graphRouteParamsSchema>;

export const projectGraphResponseSchema = z.object({
  components: z.array(z.record(z.string(), z.unknown())),
  dependencies: z.array(z.record(z.string(), z.unknown())),
  materials: z.array(z.record(z.string(), z.unknown())),
  diagnostics: z.object({
    totalComponents: z.number().int().nonnegative(),
    nodeCount: z.number().int().nonnegative(),
    totalDependencies: z.number().int().nonnegative(),
    edgeCount: z.number().int().nonnegative(),
    orphanCount: z.number().int().nonnegative(),
    hasCycles: z.boolean(),
    cyclePaths: z.array(z.array(z.string())),
    pacerDistribution: z.record(z.string(), z.number().int().nonnegative()),
    bloomDistribution: z.record(z.string(), z.number().int().nonnegative()),
  }),
});

export type ProjectGraphResponse = z.infer<typeof projectGraphResponseSchema>;

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const rawParams = await params;
    const parseResult = graphRouteParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      return new ChatbotError(
        'bad_request:api',
        parseResult.error.issues[0]?.message ?? 'Invalid route parameters',
      ).toResponse();
    }

    const { id: projectId } = parseResult.data;
    const user = await requireAuthUser();

    const project = await getProjectById({ id: projectId, userId: user.id });
    if (!project) {
      return new ChatbotError('not_found:chat', 'Project not found').toResponse();
    }

    const graphData = await getProjectGraphData({
      projectId,
      userId: user.id,
    });

    return Response.json(graphData, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}
