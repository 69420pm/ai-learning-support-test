import { requireAuthUser } from '@/lib/auth/session';
import { getChatsByUserId } from '@/lib/db/queries/chat';
import { ChatbotError } from '@/lib/errors';

export const maxDuration = 60;

// biome-ignore lint/style/useNamingConvention: Next.js HTTP method export
export async function GET(request: Request) {
  try {
    const user = await requireAuthUser();

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId') || searchParams.get('project_id') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
    const startingAfter = searchParams.get('starting_after');
    const endingBefore = searchParams.get('ending_before');

    const history = await getChatsByUserId({
      userId: user.id,
      projectId,
      limit,
      startingAfter,
      endingBefore,
    });

    return Response.json(history, { status: 200 });
  } catch (error) {
    if (error instanceof ChatbotError) {
      return error.toResponse();
    }
    return new ChatbotError('bad_request:api').toResponse();
  }
}
