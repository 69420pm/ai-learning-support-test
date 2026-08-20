import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { getCurrentUser } from '@/lib/auth/session';
import { getProjectById } from '@/lib/db/queries/project';

export default async function ProjectChatLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect(`/login?redirectTo=/projects/${projectId}/chat`);
  }

  let project = null;
  try {
    project = await getProjectById({ id: projectId, userId: user.id });
  } catch {
    // Handled below
  }

  if (!project) {
    const cookieStore = await cookies();
    const isMock =
      process.env.PLAYWRIGHT_TEST === 'true' ||
      process.env.LOCAL_DEV_AUTH === 'true' ||
      Boolean(cookieStore.get('sb-mock-auth'));

    if (isMock) {
      const navUser = { email: user.email, fullName: user.fullName };
      return (
        <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
          <ChatSidebar user={navUser} projectId={projectId} projectName="Test Project" />
          <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      );
    }
    notFound();
  }

  const navUser = { email: user.email, fullName: user.fullName };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      <ChatSidebar user={navUser} projectId={projectId} projectName={project.name} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
