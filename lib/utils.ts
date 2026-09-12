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
  const cryptoObj =
    typeof globalThis !== 'undefined' && globalThis.crypto
      ? globalThis.crypto
      : typeof crypto === 'undefined'
        ? undefined
        : crypto;

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
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
