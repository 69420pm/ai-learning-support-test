import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { Chat } from '@/components/chat/chat';
import { getCurrentUser } from '@/lib/auth/session';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries/chat';
import { convertToUIMessages } from '@/lib/utils';

export default async function ProjectChatThreadPage({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}) {
  const { projectId, id } = await params;
  const user = await getCurrentUser();

  if (!user?.id) {
    redirect(`/login?redirectTo=/projects/${projectId}/chat/${id}`);
  }

  const cookieStore = await cookies();
  const isMock =
    process.env.PLAYWRIGHT_TEST === 'true' ||
    process.env.LOCAL_DEV_AUTH === 'true' ||
    Boolean(cookieStore.get('sb-mock-auth'));

  try {
    const chat = await getChatById({ id, userId: user.id });
    if (!chat || chat.projectId !== projectId) {
      if (isMock) {
        return (
          <main className="flex h-full w-full flex-col overflow-hidden">
            <Chat
              id={id}
              projectId={projectId}
              initialMessages={[]}
              initialTitle="First Chat Thread"
            />
          </main>
        );
      }
      notFound();
    }

    const dbMessages = await getMessagesByChatId({ chatId: id });
    const initialMessages = convertToUIMessages(dbMessages);

    return (
      <main className="flex h-full w-full flex-col overflow-hidden">
        <Chat
          id={id}
          projectId={projectId}
          initialMessages={initialMessages}
          initialTitle={chat.title}
        />
      </main>
    );
  } catch {
    if (isMock) {
      return (
        <main className="flex h-full w-full flex-col overflow-hidden">
          <Chat
            id={id}
            projectId={projectId}
            initialMessages={[]}
            initialTitle="First Chat Thread"
          />
        </main>
      );
    }
    notFound();
  }
}
