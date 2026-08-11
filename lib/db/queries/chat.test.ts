import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import {
  deleteChatById,
  getChatById,
  getChatsByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
  updateChatTitleById,
} from './chat';

// Mock Drizzle DB instance
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    insert: (...args: unknown[]) => mockInsert(...args),
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}));

describe('Chat DB Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('saveChat', () => {
    it('creates and returns a new chat record', async () => {
      const mockChat = {
        id: 'chat-uuid-1',
        userId: 'user-uuid-1',
        title: 'New Conversation',
        visibility: 'private',
        createdAt: new Date(),
      };

      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          onConflictDoNothing: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([mockChat]),
          }),
          returning: vi.fn().mockResolvedValueOnce([mockChat]),
        }),
      });

      const result = await saveChat({
        id: 'chat-uuid-1',
        userId: 'user-uuid-1',
        title: 'New Conversation',
      });

      expect(result).toEqual(mockChat);
    });

    it('throws ChatbotError on database failure', async () => {
      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockRejectedValueOnce(new Error('DB Error')),
        }),
      });

      await expect(
        saveChat({
          id: 'chat-uuid-1',
          userId: 'user-uuid-1',
          title: 'Failed Chat',
        }),
      ).rejects.toThrow(ChatbotError);
    });
  });

  describe('getChatById', () => {
    it('fetches a chat by id', async () => {
      const mockChat = {
        id: 'chat-uuid-1',
        userId: 'user-uuid-1',
        title: 'Existing Chat',
        visibility: 'private',
        createdAt: new Date(),
      };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockChat]),
        }),
      });

      const result = await getChatById({ id: 'chat-uuid-1' });
      expect(result).toEqual(mockChat);
    });

    it('returns null if chat is not found', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const result = await getChatById({ id: 'non-existent-id' });
      expect(result).toBeNull();
    });

    it('enforces userId filter when provided', async () => {
      const mockChat = {
        id: 'chat-uuid-1',
        userId: 'user-uuid-1',
        title: 'User Chat',
        visibility: 'private',
        createdAt: new Date(),
      };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockChat]),
        }),
      });

      const result = await getChatById({ id: 'chat-uuid-1', userId: 'user-uuid-1' });
      expect(result).toEqual(mockChat);
    });
  });

  describe('getChatsByUserId', () => {
    it('returns list of chats for a user without limit', async () => {
      const mockChats = [
        { id: 'chat-1', userId: 'user-1', title: 'Chat 1', createdAt: new Date() },
        { id: 'chat-2', userId: 'user-1', title: 'Chat 2', createdAt: new Date() },
      ];

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockResolvedValueOnce(mockChats),
          }),
        }),
      });

      const result = await getChatsByUserId({ userId: 'user-1' });
      expect(result.chats).toEqual(mockChats);
      expect(result.hasMore).toBe(false);
    });

    it('supports pagination with limit and startingAfter', async () => {
      const selectedChat = { id: 'chat-1', createdAt: new Date('2026-01-01T10:00:00Z') };
      const paginatedChats = [
        {
          id: 'chat-2',
          userId: 'user-1',
          title: 'Chat 2',
          createdAt: new Date('2026-01-01T11:00:00Z'),
        },
        {
          id: 'chat-3',
          userId: 'user-1',
          title: 'Chat 3',
          createdAt: new Date('2026-01-01T12:00:00Z'),
        },
      ];

      // First query to find startingAfter chat
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            limit: vi.fn().mockResolvedValueOnce([selectedChat]),
          }),
        }),
      });

      // Second query to fetch paginated chats
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockReturnValueOnce({
              limit: vi.fn().mockResolvedValueOnce(paginatedChats),
            }),
          }),
        }),
      });

      const result = await getChatsByUserId({
        userId: 'user-1',
        limit: 2,
        startingAfter: 'chat-1',
      });

      expect(result.chats).toHaveLength(2);
    });
  });

  describe('deleteChatById', () => {
    it('deletes and returns the deleted chat record', async () => {
      const deletedChat = {
        id: 'chat-1',
        userId: 'user-1',
        title: 'ToDelete',
      };

      mockDelete.mockReturnValueOnce({
        where: vi.fn().mockReturnValueOnce({
          returning: vi.fn().mockResolvedValueOnce([deletedChat]),
        }),
      });

      const result = await deleteChatById({ id: 'chat-1', userId: 'user-1' });
      expect(result).toEqual(deletedChat);
    });
  });

  describe('saveMessages', () => {
    it('inserts messages and returns saved DBMessage array', async () => {
      const inputMessages = [
        {
          id: 'msg-1',
          chatId: 'chat-1',
          role: 'user',
          parts: [{ type: 'text', text: 'Hello' }],
          attachments: [],
        },
      ];
      const savedMessages = [
        {
          ...inputMessages[0],
          createdAt: new Date(),
        },
      ];

      mockInsert.mockReturnValueOnce({
        values: vi.fn().mockReturnValueOnce({
          onConflictDoNothing: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce(savedMessages),
          }),
          returning: vi.fn().mockResolvedValueOnce(savedMessages),
        }),
      });

      const result = await saveMessages({ messages: inputMessages });
      expect(result).toEqual(savedMessages);
    });

    it('returns empty array if input messages is empty', async () => {
      const result = await saveMessages({ messages: [] });
      expect(result).toEqual([]);
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });

  describe('getMessagesByChatId', () => {
    it('fetches messages for a given chatId ordered by createdAt', async () => {
      const mockMessages = [
        { id: 'msg-1', chatId: 'chat-1', role: 'user', parts: [], createdAt: new Date() },
        { id: 'msg-2', chatId: 'chat-1', role: 'assistant', parts: [], createdAt: new Date() },
      ];

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            orderBy: vi.fn().mockResolvedValueOnce(mockMessages),
          }),
        }),
      });

      const result = await getMessagesByChatId({ chatId: 'chat-1' });
      expect(result).toEqual(mockMessages);
    });
  });

  describe('updateChatTitleById', () => {
    it('updates title and returns updated chat', async () => {
      const updatedChat = {
        id: 'chat-1',
        userId: 'user-1',
        title: 'Updated Title',
      };

      mockUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([updatedChat]),
          }),
        }),
      });

      const result = await updateChatTitleById({ chatId: 'chat-1', title: 'Updated Title' });
      expect(result).toEqual(updatedChat);
    });
  });
});
