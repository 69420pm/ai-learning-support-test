'use client';

import { MoreHorizontal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { memo, useCallback } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Chat } from '@/lib/db/schema';
import { cn } from '@/lib/utils';

export type SidebarHistoryItemProps = {
  chat: Chat;
  isActive: boolean;
  onDelete: (chatId: string) => void;
  onSelect?: () => void;
};

const PureSidebarHistoryItem = ({
  chat,
  isActive,
  onDelete,
  onSelect,
}: SidebarHistoryItemProps) => {
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(chat.id);
    },
    [chat.id, onDelete],
  );

  return (
    <div
      className={cn(
        'group relative flex h-9 w-full items-center justify-between rounded-lg px-3 text-sm transition-colors hover:bg-accent/60',
        isActive ? 'bg-accent font-medium text-foreground' : 'text-muted-foreground',
      )}
    >
      <Link
        href={`/chat/${chat.id}`}
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden py-1 pr-2"
        data-testid={`chat-history-item-${chat.id}`}
      >
        <span className="truncate">{chat.title}</span>
      </Link>

      <DropdownMenu modal={true}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 hover:text-foreground group-hover:opacity-100 data-[state=open]:opacity-100"
            aria-label="Thread options"
            data-testid={`chat-item-menu-${chat.id}`}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" className="w-40">
          <DropdownMenuItem
            onClick={handleDelete}
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
            data-testid={`delete-chat-option-${chat.id}`}
          >
            <Trash2 className="mr-2 size-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export const SidebarHistoryItem = memo(PureSidebarHistoryItem, (prev, next) => {
  return (
    prev.isActive === next.isActive &&
    prev.chat.id === next.chat.id &&
    prev.chat.title === next.chat.title
  );
});
