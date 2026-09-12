import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from './errors';
import { cn, fetcher, generateUUID, getInitials } from './utils';

describe('lib/utils', () => {
  describe('cn', () => {
    it('merges class names correctly', () => {
      expect(cn('px-2 py-1', 'bg-blue-500', undefined, 'px-4')).toBe('py-1 bg-blue-500 px-4');
    });
  });

  describe('generateUUID', () => {
    it('returns a valid UUID string', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });
  });

  describe('getInitials', () => {
    it('extracts uppercase initials from name', () => {
      expect(getInitials('Ada Lovelace')).toBe('AL');
      expect(getInitials('Alan')).toBe('A');
    });

    it('falls back to fallback string when name is empty', () => {
      expect(getInitials('', 'default')).toBe('DE');
      expect(getInitials(undefined, 'guest')).toBe('GU');
    });
  });

  describe('fetcher', () => {
    const originalFetch = global.fetch;

    beforeEach(() => {
      vi.clearAllMocks();
    });

    afterEach(() => {
      global.fetch = originalFetch;
    });

    it('returns JSON data on successful response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, count: 42 }),
      } as unknown as Response);

      const data = await fetcher<{ success: boolean; count: number }>('/api/test');
      expect(data).toEqual({ success: true, count: 42 });
    });

    it('throws typed ChatbotError with domain code and cause when API responds with error JSON', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: async () => ({
          code: 'not_found:chat',
          cause: 'Chat session not found.',
        }),
      } as unknown as Response);

      await expect(fetcher('/api/chat/missing')).rejects.toThrow(ChatbotError);

      try {
        await fetcher('/api/chat/missing');
      } catch (err) {
        expect(err).toBeInstanceOf(ChatbotError);
        const chatbotErr = err as ChatbotError;
        expect(chatbotErr.type).toBe('not_found');
        expect(chatbotErr.surface).toBe('chat');
        expect(chatbotErr.cause).toBe('Chat session not found.');
      }
    });

    it('throws typed ChatbotError with bad_request:api fallback when response is not ok and body is non-json', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Unexpected token < in JSON')),
      } as unknown as Response);

      await expect(fetcher('/api/broken')).rejects.toThrow(ChatbotError);

      try {
        await fetcher('/api/broken');
      } catch (err) {
        expect(err).toBeInstanceOf(ChatbotError);
        const chatbotErr = err as ChatbotError;
        expect(chatbotErr.type).toBe('bad_request');
        expect(chatbotErr.surface).toBe('api');
      }
    });
  });
});
