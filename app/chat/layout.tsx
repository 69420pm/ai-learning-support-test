import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { getCurrentUser } from '@/lib/auth/session';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const navUser = user ? { email: user.email, fullName: user.fullName } : undefined;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      <ChatSidebar user={navUser} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
