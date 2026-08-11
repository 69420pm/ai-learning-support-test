'use client';

import { PlusIcon, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ChatHeaderProps = {
  title?: string;
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  onNewChat?: () => void;
  className?: string;
};

export function ChatHeader({
  title = 'New Chat',
  selectedModelId = 'gemini-2.5-flash',
  onModelChange: _onModelChange,
  onNewChat,
  className,
}: ChatHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-14 w-full items-center justify-between border-b border-border/40 bg-background/95 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60',
        className,
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="truncate font-semibold text-foreground text-sm sm:text-base">{title}</h1>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-border/60 bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" />
          <span className="font-medium text-foreground">{selectedModelId}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {onNewChat ? (
          <Button
            variant="outline"
            size="sm"
            onClick={onNewChat}
            className="h-8 gap-1.5 rounded-lg text-xs"
          >
            <PlusIcon className="size-3.5" />
            <span>New Chat</span>
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 rounded-lg text-xs">
            <Link href="/chat">
              <PlusIcon className="size-3.5" />
              <span>New Chat</span>
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}
