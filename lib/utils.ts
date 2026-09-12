import type { UIMessage } from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { DBMessage } from '@/lib/db/schema';
import { ChatbotError, type ErrorCode } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: message.parts as UIMessage['parts'],
  }));
}

export function getTextFromMessage(message: ChatMessage | UIMessage): string {
  if (message.parts && message.parts.length > 0) {
    return message.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part as { type: 'text'; text: string }).text)
      .join('');
  }
  if (
    'content' in message &&
    typeof (message as unknown as { content?: string }).content === 'string'
  ) {
    return (message as unknown as { content: string }).content;
  }
  return '';
}

export async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    let message = 'An error occurred while fetching data.';
    let errorCode: ErrorCode = 'bad_request:api';

    try {
      const errorJson = await res.json();
      if (errorJson?.code) {
        errorCode = errorJson.code;
      }
      if (errorJson?.cause) {
        message = String(errorJson.cause);
      } else if (errorJson?.message) {
        message = String(errorJson.message);
      }
    } catch {
      // response body was not JSON
    }

    throw new ChatbotError(errorCode, message);
  }
  return res.json();
}

export function getInitials(name?: string, fallback = ''): string {
  if (name && name.trim().length > 0) {
    return name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (fallback && fallback.trim().length > 0) {
    return fallback.trim().slice(0, 2).toUpperCase();
  }
  return '';
}
