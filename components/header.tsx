import { BookOpen } from 'lucide-react';
import Link from 'next/link';
import { UserNav } from '@/components/auth/user-nav';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/session';

export async function Header() {
  const navUser = await getCurrentUser();

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
              <Button asChild variant="ghost" size="sm">
                <Link href="/chat">Chat</Link>
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
