'use client';

import { useEffect, useRef } from 'react';

import type { ToolStatusData } from '@/lib/ai/tools';

export type CustomStreamPart = {
  type: 'data-chat-title' | 'data-tool-status' | string;
  data: unknown;
};

export type DataStreamHandlerProps = {
  dataStream?: CustomStreamPart[];
  onChatTitle?: (title: string) => void;
  onToolStatus?: (status: ToolStatusData) => void;
};

export function DataStreamHandler({
  dataStream,
  onChatTitle,
  onToolStatus,
}: DataStreamHandlerProps) {
  const processedIndexRef = useRef(0);

  useEffect(() => {
    if (!dataStream || dataStream.length === 0) return;

    for (let i = processedIndexRef.current; i < dataStream.length; i++) {
      const part = dataStream[i];
      if (part && part.type === 'data-chat-title' && typeof part.data === 'string') {
        onChatTitle?.(part.data);
      } else if (
        part &&
        part.type === 'data-tool-status' &&
        typeof part.data === 'object' &&
        part.data !== null
      ) {
        onToolStatus?.(part.data as ToolStatusData);
      }
    }
    processedIndexRef.current = dataStream.length;
  }, [dataStream, onChatTitle, onToolStatus]);

  return null;
}
