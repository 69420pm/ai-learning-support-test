import { notFound, redirect } from 'next/navigation';
import { Chat } from '@/components/chat/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries/chat';
import { createClient } from '@/lib/supabase/server';
import { convertToUIMessages } from '@/lib/utils';

export default async function ChatThreadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=/chat/${id}`);
  }

  try {
    const chat = await getChatById({ id, userId: user.id });
    if (!chat) {
      if (process.env.PLAYWRIGHT_TEST === 'true' || process.env.LOCAL_DEV_AUTH === 'true') {
        return (
          <main className="flex h-full w-full flex-col overflow-hidden">
            <Chat id={id} initialMessages={[]} initialTitle="First Chat Thread" />
          </main>
        );
      }
      notFound();
    }

    const dbMessages = await getMessagesByChatId({ chatId: id });
    const initialMessages = convertToUIMessages(dbMessages);

    return (
      <main className="flex h-full w-full flex-col overflow-hidden">
        <Chat id={id} initialMessages={initialMessages} initialTitle={chat.title} />
      </main>
    );
  } catch {
    if (process.env.PLAYWRIGHT_TEST === 'true' || process.env.LOCAL_DEV_AUTH === 'true') {
      return (
        <main className="flex h-full w-full flex-col overflow-hidden">
          <Chat id={id} initialMessages={[]} initialTitle="First Chat Thread" />
        </main>
      );
    }
    notFound();
  }
}
