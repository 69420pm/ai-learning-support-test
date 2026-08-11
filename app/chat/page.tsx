import { Chat } from '@/components/chat/chat';

export default function ChatPage() {
  return (
    <main className="flex h-[calc(100vh-3.5rem)] w-full flex-col overflow-hidden">
      <Chat />
    </main>
  );
}
