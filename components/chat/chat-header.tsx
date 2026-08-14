'use client';

import { ModelSelector } from '@/components/chat/model-selector';
import { DEFAULT_MODEL_ID } from '@/lib/ai/providers';
import { cn } from '@/lib/utils';

export type ChatHeaderProps = {
  title?: string;
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
};

export function ChatHeader({
  title = 'New Chat',
  selectedModelId = DEFAULT_MODEL_ID,
  onModelChange,
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

        <ModelSelector selectedModelId={selectedModelId} onModelChange={onModelChange} />
      </div>
    </header>
  );
}
