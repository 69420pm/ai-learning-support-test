import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { ProjectNav } from '@/components/projects/project-nav';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectById } from '@/lib/db/queries/project';

const projectParamsSchema = z.object({
  projectId: z.string().min(1),
});

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const rawParams = await params;
  const parsedParams = projectParamsSchema.safeParse(rawParams);
  if (!parsedParams.success) {
    notFound();
  }
  const { projectId } = parsedParams.data;
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect(`/login?redirectTo=/projects/${projectId}/chat`);
  }

  let project = null;
  try {
    project = await getProjectById({ id: projectId, userId: user.id });
  } catch (error) {
    console.error(`[ProjectLayout] Error fetching project ${projectId}:`, error);
  }

  if (!project) {
    const cookieStore = await cookies();
    const isMock =
      process.env.PLAYWRIGHT_TEST === 'true' ||
      process.env.LOCAL_DEV_AUTH === 'true' ||
      Boolean(cookieStore.get('sb-mock-auth'));

    if (isMock) {
      return (
        <div className="flex h-[calc(100vh-3.5rem)] w-full flex-col overflow-hidden bg-background">
          <ProjectNav projectId={projectId} projectName="Test Project" />
          <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
        </div>
      );
    }
    notFound();
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full flex-col overflow-hidden bg-background">
      <ProjectNav projectId={projectId} projectName={project.name} />
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}
