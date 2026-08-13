'use client';

import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import type React from 'react';
import { useMemo, useState } from 'react';
import { useSWRConfig } from 'swr';
import { ChatHeader } from '@/components/chat/chat-header';
import { ChatInput } from '@/components/chat/chat-input';
import { ChatMessages } from '@/components/chat/chat-messages';
import { type CustomStreamPart, DataStreamHandler } from '@/components/chat/data-stream-handler';
import type { ChatMessage } from '@/lib/types';
import { cn, generateUUID } from '@/lib/utils';

export type ChatProps = {
  id?: string;
  initialMessages?: ChatMessage[];
  initialTitle?: string;
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
};

export function Chat({
  id: initialId,
  initialMessages = [],
  initialTitle = 'New Chat',
  selectedModelId: propSelectedModelId = 'gemini-2.5-flash',
  onModelChange: propOnModelChange,
  className,
}: ChatProps) {
  const [chatId] = useState(() => initialId || generateUUID());
  const [input, setInput] = useState('');
  const [title, setTitle] = useState(initialTitle);
  const [selectedModelId, setSelectedModelId] = useState(propSelectedModelId);
  const [hasNavigated, setHasNavigated] = useState(Boolean(initialId));
  const [dataStreamParts, setDataStreamParts] = useState<CustomStreamPart[]>([]);
  const { mutate } = useSWRConfig();

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId);
    propOnModelChange?.(modelId);
  };

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: {
          id: chatId,
          model: selectedModelId,
          selectedChatModel: selectedModelId,
        },
      }),
    [chatId, selectedModelId],
  );

  const { messages, sendMessage, stop, status } = useChat({
    id: chatId,
    messages: initialMessages,
    transport,
    onData: (data: unknown) => {
      if (data && typeof data === 'object') {
        setDataStreamParts((prev) => [...prev, data as CustomStreamPart]);
      }
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || status === 'streaming' || status === 'submitted') return;

    if (!initialId && !hasNavigated) {
      setHasNavigated(true);
      if (typeof window !== 'undefined') {
        window.history.replaceState({}, '', `/chat/${chatId}`);
      }
    }

    const userText = input;
    setInput('');

    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: userText }],
    });
  };

  const handleChatTitle = (newTitle: string) => {
    setTitle(newTitle);
    mutate('/api/history');
  };

  return (
    <div className={cn('flex h-full w-full flex-col overflow-hidden bg-background', className)}>
      <ChatHeader
        title={title}
        selectedModelId={selectedModelId}
        onModelChange={handleModelChange}
      />
      <ChatMessages
        messages={messages}
        isLoading={status === 'streaming' || status === 'submitted'}
      />
      <ChatInput
        input={input}
        setInput={setInput}
        onSubmit={handleSubmit}
        status={status}
        stop={stop}
        isLoading={status === 'streaming' || status === 'submitted'}
      />
      <DataStreamHandler dataStream={dataStreamParts} onChatTitle={handleChatTitle} />
    </div>
  );
}
