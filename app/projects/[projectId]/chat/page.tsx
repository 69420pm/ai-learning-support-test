import { Chat } from '@/components/chat/chat';

export default async function ProjectChatPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <main className="flex h-full w-full flex-col overflow-hidden">
      <Chat projectId={projectId} />
    </main>
  );
}
