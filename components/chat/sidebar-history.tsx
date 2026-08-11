'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import useSWR from 'swr';
import { SidebarHistoryItem } from '@/components/chat/sidebar-history-item';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Chat } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';

export type SidebarHistoryProps = {
  user?: {
    email?: string;
    fullName?: string;
  };
  onSelectChat?: () => void;
};

type HistoryResponse = {
  chats: Chat[];
  hasMore?: boolean;
};

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function isWithinLast7Days(date: Date): boolean {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return date > sevenDaysAgo && !isToday(date) && !isYesterday(date);
}

function groupChats(chats: Chat[]) {
  const groups: {
    today: Chat[];
    yesterday: Chat[];
    lastWeek: Chat[];
    older: Chat[];
  } = {
    today: [],
    yesterday: [],
    lastWeek: [],
    older: [],
  };

  for (const chat of chats) {
    const chatDate = new Date(chat.createdAt);
    if (isToday(chatDate)) {
      groups.today.push(chat);
    } else if (isYesterday(chatDate)) {
      groups.yesterday.push(chat);
    } else if (isWithinLast7Days(chatDate)) {
      groups.lastWeek.push(chat);
    } else {
      groups.older.push(chat);
    }
  }

  return groups;
}

export function SidebarHistory({ user, onSelectChat }: SidebarHistoryProps) {
  const pathname = usePathname();
  const router = useRouter();

  const { data, mutate, isLoading } = useSWR<HistoryResponse>(
    user ? '/api/history' : null,
    fetcher,
    {
      revalidateOnFocus: true,
    },
  );

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleShowDeleteDialog = useCallback((chatId: string) => {
    setDeleteId(chatId);
    setShowDeleteDialog(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteId) return;

    const chatToDelete = deleteId;
    const isCurrentChat = pathname === `/chat/${chatToDelete}`;
    setShowDeleteDialog(false);
    setDeleteId(null);

    // Optimistic update
    mutate(
      (current) =>
        current
          ? {
              ...current,
              chats: current.chats.filter((c) => c.id !== chatToDelete),
            }
          : current,
      false,
    );

    if (isCurrentChat) {
      router.replace('/chat');
    }

    try {
      await fetch(`/api/chat?id=${chatToDelete}`, { method: 'DELETE' });
    } catch {
      // Revert if error
    } finally {
      mutate();
    }
  }, [deleteId, mutate, pathname, router]);

  if (!user) {
    return (
      <div className="p-4 text-center text-muted-foreground text-xs">
        Sign in to save and view past conversations.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-2 p-3">
        {[44, 32, 28, 64].map((width) => (
          <div
            key={width}
            className="h-8 animate-pulse rounded-md bg-muted/50"
            style={{ width: `${width + 30}%` }}
          />
        ))}
      </div>
    );
  }

  const chats = data?.chats || [];

  if (chats.length === 0) {
    return (
      <div
        className="p-4 text-center text-muted-foreground text-xs"
        data-testid="empty-chat-history"
      >
        Your past conversations will appear here.
      </div>
    );
  }

  const grouped = groupChats(chats);

  const activeId = pathname.startsWith('/chat/') ? pathname.split('/')[2] : null;

  return (
    <>
      <div className="flex flex-col gap-4 overflow-y-auto p-2" data-testid="sidebar-history-list">
        {grouped.today.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              Today
            </div>
            {grouped.today.map((chat) => (
              <SidebarHistoryItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeId}
                onDelete={handleShowDeleteDialog}
                onSelect={onSelectChat}
              />
            ))}
          </div>
        )}

        {grouped.yesterday.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              Yesterday
            </div>
            {grouped.yesterday.map((chat) => (
              <SidebarHistoryItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeId}
                onDelete={handleShowDeleteDialog}
                onSelect={onSelectChat}
              />
            ))}
          </div>
        )}

        {grouped.lastWeek.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              Last 7 Days
            </div>
            {grouped.lastWeek.map((chat) => (
              <SidebarHistoryItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeId}
                onDelete={handleShowDeleteDialog}
                onSelect={onSelectChat}
              />
            ))}
          </div>
        )}

        {grouped.older.length > 0 && (
          <div className="space-y-1">
            <div className="px-2 font-semibold text-[10px] text-muted-foreground uppercase tracking-wider">
              Older
            </div>
            {grouped.older.map((chat) => (
              <SidebarHistoryItem
                key={chat.id}
                chat={chat}
                isActive={chat.id === activeId}
                onDelete={handleShowDeleteDialog}
                onSelect={onSelectChat}
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all associated messages. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-chat">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="confirm-delete-chat"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
