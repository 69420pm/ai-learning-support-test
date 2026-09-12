import { z } from 'zod';
import { type AuthUser, requireAuthUser } from '@/lib/auth/session';
import { getProjectById } from '@/lib/db/queries/project';
import type { Project } from '@/lib/db/schema';
import { ChatbotError, type ErrorCode, type Surface } from '@/lib/errors';

const projectRouteParamsSchema = z.object({
  id: z.string().trim().min(1, 'A valid project ID is required'),
});

export type ProjectContextOptions = {
  surface?: Surface;
};

export type ProjectContextResult = {
  project: Project;
  user: AuthUser;
  projectId: string;
};

/**
 * Single atomic project context resolution seam.
 * Authenticates the user, resolves the project record, and enforces ownership scoping.
 * Throws typed ChatbotError ('unauthorized', 'bad_request:api', or 'not_found:chat') if verification fails.
 */
export async function requireProjectContext(
  paramsOrId:
    | Promise<{ id?: string; projectId?: string }>
    | { id?: string; projectId?: string }
    | string,
  userIdOrOptions?: string | ProjectContextOptions,
  options?: ProjectContextOptions,
): Promise<ProjectContextResult> {
  const isDirectUserId = typeof userIdOrOptions === 'string';
  const effectiveOptions = (isDirectUserId ? options : userIdOrOptions) ?? {};
  const surface: Surface = effectiveOptions.surface ?? 'chat';

  let rawId: string | undefined;

  if (typeof paramsOrId === 'string') {
    rawId = paramsOrId;
  } else {
    const resolved = await paramsOrId;
    rawId = resolved?.id ?? resolved?.projectId;
  }

  const parseResult = projectRouteParamsSchema.safeParse({ id: rawId });
  if (!parseResult.success) {
    throw new ChatbotError(
      'bad_request:api',
      parseResult.error.issues[0]?.message ?? 'A valid project ID is required',
    );
  }

  const projectId = parseResult.data.id;

  let user: AuthUser;
  if (isDirectUserId) {
    user = { id: userIdOrOptions, email: '' };
  } else {
    user = await requireAuthUser(surface);
  }

  const project = await getProjectById({
    id: projectId,
    userId: user.id,
  });

  if (!project) {
    const notFoundCode: ErrorCode = `not_found:${surface}`;
    throw new ChatbotError(notFoundCode, 'Project not found');
  }

  return {
    project,
    user,
    projectId: project.id,
  };
}
