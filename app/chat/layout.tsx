import { cookies } from 'next/headers';
import { ChatSidebar } from '@/components/chat/chat-sidebar';
import { createClient } from '@/lib/supabase/server';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  let navUser: { email?: string; fullName?: string } | undefined;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      navUser = {
        email: user.email ?? '',
        fullName: (user.user_metadata?.full_name as string | undefined) ?? undefined,
      };
    } else if (process.env.PLAYWRIGHT_TEST === 'true' || process.env.LOCAL_DEV_AUTH === 'true') {
      const cookieStore = await cookies();
      const mockAuth = cookieStore.get('sb-mock-auth');
      if (mockAuth?.value) {
        try {
          const parsed = JSON.parse(mockAuth.value);
          navUser = {
            email: parsed.email ?? '',
            fullName: (parsed.user_metadata?.full_name as string | undefined) ?? undefined,
          };
        } catch {
          // ignore
        }
      }
    }
  } catch (error) {
    console.error('Failed to fetch user session in ChatLayout:', error);
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-background">
      <ChatSidebar user={navUser} />
      <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
    </div>
  );
}
