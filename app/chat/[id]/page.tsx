import { notFound, redirect } from 'next/navigation';
import { getChatById } from '@/lib/db/queries/chat';
import { createClient } from '@/lib/supabase/server';

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
        redirect('/');
      }
      notFound();
    }

    if (chat.projectId) {
      redirect(`/projects/${chat.projectId}/chat/${id}`);
    } else {
      redirect('/');
    }
  } catch {
    redirect('/');
  }
}
