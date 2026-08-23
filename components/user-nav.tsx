'use client';

import { LayoutDashboard, LogOut, Settings, UserIcon } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/lib/auth/actions';
import { getInitials } from '@/lib/utils';

export type UserNavProps = {
  user: {
    email: string;
    fullName?: string;
    avatarUrl?: string;
  } | null;
};

export function UserNav({ user }: UserNavProps) {
  if (!user) return null;

  const initials = getInitials(user.fullName, user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative size-9 rounded-full"
          data-testid="user-nav-trigger"
        >
          <Avatar className="size-9">
            {user.avatarUrl && (
              <AvatarImage src={user.avatarUrl} alt={user.fullName || user.email} />
            )}
            <AvatarFallback>{initials || <UserIcon className="size-4" />}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-1">
            <p className="font-medium text-sm leading-none">{user.fullName || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground" data-testid="user-nav-email">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/" className="flex w-full items-center gap-2 cursor-pointer">
              <LayoutDashboard className="size-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link
              href="/settings"
              className="flex w-full items-center gap-2 cursor-pointer"
              data-testid="user-nav-settings"
            >
              <Settings className="size-4" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-destructive focus:text-destructive"
          data-testid="user-nav-logout"
          onClick={() => signOut()}
        >
          <LogOut className="mr-2 size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
