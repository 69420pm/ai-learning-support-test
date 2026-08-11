import type { UIMessage } from 'ai';

export type MessageMetadata = {
  createdAt?: string;
};

export type CustomUIDataTypes = {
  'chat-title': string;
};

export type ChatMessage = UIMessage;
