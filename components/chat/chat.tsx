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
import { MaterialUploadDialog, ViewportDropOverlay } from '@/components/document';
import { DEFAULT_MODEL_ID } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/types';
import { cn, generateUUID } from '@/lib/utils';

export type ChatProps = {
  id?: string;
  projectId?: string;
  initialMessages?: ChatMessage[];
  initialTitle?: string;
  selectedModelId?: string;
  onModelChange?: (modelId: string) => void;
  className?: string;
};

export function Chat({
  id: initialId,
  projectId,
  initialMessages = [],
  initialTitle = 'New Chat',
  selectedModelId: initialSelectedModelId = DEFAULT_MODEL_ID,
  onModelChange,
  className,
}: ChatProps) {
  const [chatId] = useState(() => initialId || generateUUID());
  const [selectedModelId, setSelectedModelId] = useState(initialSelectedModelId);
  const [input, setInput] = useState('');
  const [title, setTitle] = useState(initialTitle);
  const [hasNavigated, setHasNavigated] = useState(Boolean(initialId));
  const [dataStreamParts, setDataStreamParts] = useState<CustomStreamPart[]>([]);
  const { mutate } = useSWRConfig();

  const handleModelChange = (newModelId: string) => {
    setSelectedModelId(newModelId);
    onModelChange?.(newModelId);
  };

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        body: {
          id: chatId,
          projectId,
          model: selectedModelId,
          selectedChatModel: selectedModelId,
        },
      }),
    [chatId, selectedModelId, projectId],
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
        const targetUrl = projectId ? `/projects/${projectId}/chat/${chatId}` : `/chat/${chatId}`;
        window.history.replaceState({}, '', targetUrl);
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
    if (projectId) {
      mutate(`/api/history?projectId=${projectId}`);
    }
    mutate('/api/history');
    mutate('/api/projects');
  };

  const [dropFiles, setDropFiles] = useState<File[]>([]);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const handleFilesDropped = (files: File[]) => {
    if (files.length > 0) {
      setDropFiles(files);
      setUploadDialogOpen(true);
    }
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

      {projectId && (
        <>
          <ViewportDropOverlay onFilesDropped={handleFilesDropped} />
          <MaterialUploadDialog
            projectId={projectId}
            open={uploadDialogOpen}
            onOpenChange={setUploadDialogOpen}
            initialFiles={dropFiles}
          />
        </>
      )}
    </div>
  );
}
