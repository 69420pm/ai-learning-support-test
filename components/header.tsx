import { BookOpen, MessageSquare } from 'lucide-react';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { UserNav } from '@/components/auth/user-nav';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';

export async function Header() {
  let navUser = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      navUser = {
        email: user.email ?? '',
        fullName: (user.user_metadata?.full_name as string | undefined) ?? undefined,
        avatarUrl: (user.user_metadata?.avatar_url as string | undefined) ?? undefined,
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
    console.error('Failed to fetch user session in Header:', error);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg tracking-tight">
          <BookOpen className="size-5 text-primary" />
          <span>AI Learning Support</span>
        </Link>
        <div className="flex items-center gap-4">
          {navUser ? (
            <div className="flex items-center gap-3">
              <Button asChild variant="ghost" size="sm" className="gap-1.5 font-medium">
                <Link href="/chat">
                  <MessageSquare className="size-4" />
                  <span>Chat</span>
                </Link>
              </Button>
              <UserNav user={navUser} />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign In</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
