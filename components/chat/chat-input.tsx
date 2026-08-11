'use client';

import { ArrowUp, Square } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ChatInputProps = {
  input: string;
  setInput: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isLoading?: boolean;
  status?: string;
  stop?: () => void;
  placeholder?: string;
  className?: string;
};

export function ChatInput({
  input,
  setInput,
  onSubmit,
  isLoading = false,
  status,
  stop,
  placeholder = 'Ask AI Learning Support...',
  className,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = status === 'streaming' || status === 'submitted' || isLoading;

  // biome-ignore lint/correctness/useExhaustiveDependencies: textarea height calculation depends on input value changes
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = textarea.scrollHeight;
      // Cap max height to ~6 lines (approx 150px)
      textarea.style.height = `${Math.min(scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (input.trim() && !isStreaming) {
        onSubmit(e);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      onSubmit(e);
    }
  };

  return (
    <div className={cn('w-full px-4 pb-4 pt-2 bg-background', className)}>
      <form
        onSubmit={handleSubmit}
        className="relative mx-auto flex max-w-4xl flex-col rounded-2xl border border-border/80 bg-card p-2 shadow-sm transition-all focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="w-full resize-none bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />

        <div className="flex items-center justify-between pt-1">
          <div className="px-3 text-xs text-muted-foreground select-none">
            Shift + Enter for new line
          </div>

          <div className="flex items-center gap-1.5">
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                variant="destructive"
                onClick={stop}
                className="size-8 rounded-xl shrink-0"
                aria-label="Stop generation"
              >
                <Square className="size-4 fill-current" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className="size-8 rounded-xl shrink-0 transition-opacity"
                aria-label="Send message"
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
