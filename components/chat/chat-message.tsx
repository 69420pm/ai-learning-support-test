'use client';

import { Bot, Check, Copy, User } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { codeToHtml } from 'shiki';
import {
  type MaterialSearchResult,
  MaterialSearchWidget,
} from '@/components/chat/material-search-widget';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { cn, getTextFromMessage } from '@/lib/utils';

export type ChatMessageProps = {
  message: ChatMessageType;
  isLoading?: boolean;
  className?: string;
};

function CodeBlock({ children, className }: { children?: React.ReactNode; className?: string }) {
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const rawCode = String(children || '').replace(/\n$/, '');
  const [copied, setCopied] = useState(false);
  const [highlightedHtml, setHighlightedHtml] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    if (language || rawCode.includes('\n')) {
      const targetLang = language || 'text';
      codeToHtml(rawCode, {
        lang: targetLang,
        theme: 'github-dark',
      })
        .catch(() =>
          codeToHtml(rawCode, {
            lang: 'text',
            theme: 'github-dark',
          }),
        )
        .then((html) => {
          if (isCurrent) setHighlightedHtml(html);
        });
    }
    return () => {
      isCurrent = false;
    };
  }, [rawCode, language]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard fallback or permission error */
    }
  };

  const isInline = !match && !rawCode.includes('\n');

  if (isInline) {
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm text-foreground">
        {children}
      </code>
    );
  }

  return (
    <div className="relative my-4 overflow-hidden rounded-xl border border-border/60 bg-zinc-950 font-mono text-xs text-zinc-50 shadow-md">
      <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-2 text-zinc-400">
        <span className="font-medium text-xs tracking-wide text-zinc-300 uppercase">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
          aria-label="Copy code"
        >
          {copied ? (
            <>
              <Check className="size-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied</span>
            </>
          ) : (
            <>
              <Copy className="size-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      <div className="p-4 overflow-x-auto">
        {highlightedHtml ? (
          <div
            className="shiki-container [&>pre]:!bg-transparent [&>pre]:!m-0 [&>pre]:!p-0 [&>pre]:overflow-x-auto"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: shiki generates sanitized syntax highlighted HTML
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        ) : (
          <pre className="overflow-x-auto font-mono text-xs leading-relaxed text-zinc-200">
            <code>{rawCode}</code>
          </pre>
        )}
      </div>
    </div>
  );
}

const markdownComponents: Components = {
  pre({ children }) {
    return <>{children}</>;
  },
  code({ children, className }) {
    return <CodeBlock className={className}>{children}</CodeBlock>;
  },
};

type ToolInvocationInfo = {
  id: string;
  query: string;
  status: 'searching' | 'completed' | 'error';
  results?: MaterialSearchResult[];
  error?: string;
};

function parseSearchStateAndResults(p: Record<string, unknown>, out?: Record<string, unknown>) {
  if (p.state === 'input-streaming' || p.state === 'input-available') {
    return { status: 'searching' as const, results: undefined, error: undefined };
  }
  if (p.state === 'output-error') {
    return {
      status: 'error' as const,
      results: undefined,
      error: typeof p.errorText === 'string' ? p.errorText : 'Search error',
    };
  }
  if (p.state === 'output-available') {
    const results = Array.isArray(out?.results) ? (out.results as MaterialSearchResult[]) : [];
    const error = typeof out?.error === 'string' ? out.error : undefined;
    return {
      status: error ? ('error' as const) : ('completed' as const),
      results,
      error,
    };
  }
  return { status: 'completed' as const, results: undefined, error: undefined };
}

function parseDirectToolPart(p: Record<string, unknown>, index: number): ToolInvocationInfo | null {
  const isStaticTool = p.type === 'tool-searchProjectMaterials';
  const isDynamicTool = p.type === 'dynamic-tool' && p.toolName === 'searchProjectMaterials';
  if (!isStaticTool && !isDynamicTool) return null;

  const inputObj = p.input as Record<string, unknown> | undefined;
  const query = typeof inputObj?.query === 'string' ? inputObj.query : '';
  const out = p.output as Record<string, unknown> | undefined;
  const stateInfo = parseSearchStateAndResults(p, out);
  return {
    id: (p.toolCallId as string) || `search-${index}`,
    query,
    ...stateInfo,
  };
}

function parseLegacyToolInvocationPart(
  p: Record<string, unknown>,
  index: number,
): ToolInvocationInfo | null {
  if (p.type !== 'tool-invocation' || typeof p.toolInvocation !== 'object' || !p.toolInvocation) {
    return null;
  }
  const inv = p.toolInvocation as Record<string, unknown>;
  if (inv.toolName !== 'searchProjectMaterials') return null;

  const args = inv.args as Record<string, unknown> | undefined;
  const query = typeof args?.query === 'string' ? args.query : '';
  const res = inv.result as Record<string, unknown> | undefined;
  const isResult = inv.state === 'result';
  const results = Array.isArray(res?.results) ? (res.results as MaterialSearchResult[]) : [];
  const error = typeof res?.error === 'string' ? res.error : undefined;
  return {
    id: (inv.toolCallId as string) || `search-${index}`,
    query,
    status: isResult ? (error ? 'error' : 'completed') : 'searching',
    results: isResult ? results : undefined,
    error: isResult ? error : undefined,
  };
}

function parsePart(part: unknown, index: number): ToolInvocationInfo | null {
  if (!part || typeof part !== 'object') return null;
  const p = part as Record<string, unknown>;
  return parseDirectToolPart(p, index) ?? parseLegacyToolInvocationPart(p, index);
}

function extractMaterialSearches(parts?: ChatMessageType['parts']): ToolInvocationInfo[] {
  if (!Array.isArray(parts)) return [];
  return parts
    .map((part, index) => parsePart(part, index))
    .filter((s): s is ToolInvocationInfo => s !== null);
}

export function ChatMessage({ message, isLoading = false, className }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const textContent = getTextFromMessage(message);
  const searches = isUser ? [] : extractMaterialSearches(message.parts);

  return (
    <div
      className={cn(
        'flex w-full gap-3 sm:gap-4 py-3 px-2 sm:px-4 transition-colors',
        isUser ? 'flex-row-reverse' : 'flex-row',
        className,
      )}
    >
      <div
        className={cn(
          'flex size-8 shrink-0 select-none items-center justify-center rounded-full border shadow-sm',
          isUser
            ? 'bg-primary text-primary-foreground border-primary/20'
            : 'bg-muted text-foreground border-border/60',
        )}
      >
        {isUser ? <User className="size-4" /> : <Bot className="size-4 text-primary" />}
      </div>

      <div
        className={cn(
          'flex min-w-0 max-w-[85%] sm:max-w-[80%] flex-col gap-1',
          isUser ? 'items-end' : 'items-start',
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-tr-xs'
              : 'bg-card border border-border/60 text-card-foreground rounded-tl-xs',
          )}
        >
          {searches.map((search) => (
            <MaterialSearchWidget
              key={search.id}
              query={search.query}
              status={search.status}
              results={search.results}
              error={search.error}
            />
          ))}

          {isUser ? (
            <p className="whitespace-pre-wrap break-words">{textContent}</p>
          ) : (
            textContent && (
              <div className="prose dark:prose-invert max-w-none text-sm break-words [&>p]:leading-relaxed [&>p]:mb-3 [&>p:last-child]:mb-0">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                  {textContent}
                </ReactMarkdown>
              </div>
            )
          )}

          {isLoading && !textContent && searches.length === 0 && (
            <div className="flex items-center gap-1.5 py-1 text-muted-foreground">
              <span className="size-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
              <span className="size-2 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
              <span className="size-2 animate-bounce rounded-full bg-primary/60" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
