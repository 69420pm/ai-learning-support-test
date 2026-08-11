'use client';

import { ArrowDown } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/components/chat/chat-message';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { cn } from '@/lib/utils';

export type ChatMessagesProps = {
  messages: ChatMessageType[];
  isLoading?: boolean;
  className?: string;
};

export function ChatMessages({ messages, isLoading = false, className }: ChatMessagesProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isUserScrollingRef = useRef(false);

  const checkIfAtBottom = useCallback(() => {
    if (!containerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    return scrollTop + clientHeight >= scrollHeight - 100;
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior,
    });
  }, []);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      isUserScrollingRef.current = true;
      clearTimeout(timeoutId);

      const atBottom = checkIfAtBottom();
      setIsAtBottom(atBottom);

      timeoutId = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, 150);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [checkIfAtBottom]);

  // Auto-scroll when messages update if at bottom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollIfNeeded = () => {
      if (!isUserScrollingRef.current && checkIfAtBottom()) {
        requestAnimationFrame(() => {
          scrollToBottom('instant');
          setIsAtBottom(true);
        });
      }
    };

    const observer = new MutationObserver(scrollIfNeeded);
    observer.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    scrollIfNeeded();

    return () => observer.disconnect();
  }, [checkIfAtBottom, scrollToBottom]);

  return (
    <div className={cn('relative flex-1 overflow-hidden bg-background', className)}>
      <div ref={containerRef} className="h-full w-full overflow-y-auto touch-pan-y">
        <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-end px-2 py-6 md:px-4">
          {messages.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-16 text-center">
              <div className="rounded-full bg-primary/10 p-4 mb-4">
                <span className="text-2xl">✨</span>
              </div>
              <h2 className="font-semibold text-foreground text-lg mb-1">
                AI Learning Support Chat
              </h2>
              <p className="max-w-sm text-sm text-muted-foreground">
                Ask questions, explore course concepts, or request python code examples to get
                started.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {messages.map((msg, index) => (
                <ChatMessage
                  key={msg.id || `msg-${index}`}
                  message={msg}
                  isLoading={isLoading && index === messages.length - 1 && msg.role === 'assistant'}
                />
              ))}
              <div ref={endRef} className="h-4 shrink-0" />
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        aria-label="Scroll to bottom"
        onClick={() => scrollToBottom('smooth')}
        className={cn(
          'absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border/60 bg-background/90 px-3 py-1.5 text-xs text-muted-foreground shadow-lg backdrop-blur-md transition-all duration-200 hover:bg-accent hover:text-accent-foreground',
          isAtBottom
            ? 'pointer-events-none scale-90 opacity-0'
            : 'pointer-events-auto scale-100 opacity-100',
        )}
      >
        <ArrowDown className="size-3.5" />
        <span>Scroll to bottom</span>
      </button>
    </div>
  );
}
