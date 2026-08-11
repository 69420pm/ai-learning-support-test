'use client';

import { useEffect, useRef } from 'react';

export type CustomStreamPart = {
  type: 'data-chat-title' | string;
  data: unknown;
};

export type DataStreamHandlerProps = {
  dataStream?: CustomStreamPart[];
  onChatTitle?: (title: string) => void;
};

export function DataStreamHandler({ dataStream, onChatTitle }: DataStreamHandlerProps) {
  const processedIndexRef = useRef(0);

  useEffect(() => {
    if (!dataStream || dataStream.length === 0) return;

    for (let i = processedIndexRef.current; i < dataStream.length; i++) {
      const part = dataStream[i];
      if (part && part.type === 'data-chat-title' && typeof part.data === 'string') {
        onChatTitle?.(part.data);
      }
    }
    processedIndexRef.current = dataStream.length;
  }, [dataStream, onChatTitle]);

  return null;
}
