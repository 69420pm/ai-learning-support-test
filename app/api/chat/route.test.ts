import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DELETE, POST } from './route';

// Mock dependencies
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

const mockSaveChat = vi.fn();
const mockGetChatById = vi.fn();
const mockSaveMessages = vi.fn();
const mockGetMessagesByChatId = vi.fn();
const mockUpdateChatTitleById = vi.fn();
const mockDeleteChatById = vi.fn();
const mockGetProjectById = vi.fn();

vi.mock('@/lib/db/queries/project', () => ({
  getProjectById: (...args: unknown[]) => mockGetProjectById(...args),
}));

vi.mock('@/lib/db/queries/chat', () => ({
  saveChat: (...args: unknown[]) => mockSaveChat(...args),
  getChatById: (...args: unknown[]) => mockGetChatById(...args),
  saveMessages: (...args: unknown[]) => mockSaveMessages(...args),
  getMessagesByChatId: (...args: unknown[]) => mockGetMessagesByChatId(...args),
  updateChatTitleById: (...args: unknown[]) => mockUpdateChatTitleById(...args),
  deleteChatById: (...args: unknown[]) => mockDeleteChatById(...args),
}));

// Mock AI SDK language model and generateText
const mockLanguageModel = {
  specificationVersion: 'v2',
  provider: 'mock',
  modelId: 'mock-model',
  defaultObjectGenerationMode: 'tool',
  doGenerate: vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: 'Mocked Generated Title' }],
    finishReason: 'stop',
    usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    warnings: [],
  }),
  doStream: vi.fn().mockResolvedValue({
    stream: new ReadableStream({
      start(controller) {
        controller.enqueue({ type: 'text-start', id: 't1' });
        controller.enqueue({ type: 'text-delta', id: 't1', delta: 'Hello world' });
        controller.enqueue({ type: 'text-end', id: 't1' });
        controller.enqueue({
          type: 'finish',
          finishReason: 'stop',
          usage: { inputTokens: 5, outputTokens: 5 },
        });
        controller.close();
      },
    }),
  }),
};

vi.mock('@/lib/ai/providers', () => ({
  getLanguageModel: vi.fn().mockImplementation(() => mockLanguageModel),
  getTitleModel: vi.fn().mockImplementation(() => mockLanguageModel),
}));

describe('Chat API Handler (/api/chat)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/chat', () => {
    it('returns 401 Unauthorized when session is unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '550e8400-e29b-41d4-a716-446655440000',
          message: { id: 'msg-1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.code).toBe('unauthorized:chat');
    });

    it('returns 400 Bad Request on invalid body schema', async () => {
      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'not-a-uuid',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe('bad_request:api');
    });

    it('creates chat and streams response when authenticated', async () => {
      const testUser = { id: 'user-uuid-123', email: 'test@example.com' };
      const projectId = '770e8400-e29b-41d4-a716-446655440000';
      mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });
      mockGetChatById.mockResolvedValueOnce(null); // Chat does not exist yet
      mockGetProjectById.mockResolvedValueOnce({
        id: projectId,
        userId: testUser.id,
        name: 'Math',
      });
      mockSaveChat.mockResolvedValueOnce({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: testUser.id,
        projectId,
        title: 'New chat',
      });

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '550e8400-e29b-41d4-a716-446655440000',
          projectId,
          message: {
            id: '11111111-2222-4444-8888-999999999999',
            role: 'user',
            parts: [{ type: 'text', text: 'Tell me a joke' }],
          },
          provider: 'google',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      expect(response.headers.get('content-type')).toContain('text/event-stream');

      // Consume stream to trigger execution & onEnd callbacks
      const reader = response.body?.getReader();
      if (reader) {
        let done = false;
        while (!done) {
          const res = await reader.read();
          done = res.done;
        }
      }

      expect(mockSaveChat).toHaveBeenCalledWith({
        id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'New chat',
        userId: testUser.id,
        projectId,
      });

      expect(mockSaveMessages).toHaveBeenCalledWith({
        messages: expect.arrayContaining([
          expect.objectContaining({
            id: '11111111-2222-4444-8888-999999999999',
            chatId: '550e8400-e29b-41d4-a716-446655440000',
            role: 'user',
          }),
        ]),
      });
    });

    it('returns 400 if projectId is missing for a new chat', async () => {
      const testUser = { id: 'user-uuid-123', email: 'test@example.com' };
      mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });
      mockGetChatById.mockResolvedValueOnce(null);

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '550e8400-e29b-41d4-a716-446655440000',
          message: { id: 'msg-1', role: 'user', parts: [{ type: 'text', text: 'Hi' }] },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.code).toBe('bad_request:api');
    });

    it('returns 403 Forbidden if user tries to post to another user chat', async () => {
      const testUser = { id: 'user-uuid-123', email: 'test@example.com' };
      mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });
      mockGetChatById.mockResolvedValueOnce({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'other-user-id',
        title: 'Secret Chat',
      });

      const request = new Request('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: '550e8400-e29b-41d4-a716-446655440000',
          message: { id: 'msg-user-1', role: 'user', parts: [{ type: 'text', text: 'Hello' }] },
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(403);
      const json = await response.json();
      expect(json.code).toBe('forbidden:chat');
    });
  });

  describe('DELETE /api/chat', () => {
    it('returns 401 Unauthorized when unauthenticated', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

      const request = new Request(
        'http://localhost:3000/api/chat?id=550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'DELETE',
        },
      );

      const response = await DELETE(request);
      expect(response.status).toBe(401);
    });

    it('deletes chat when authenticated user owns it', async () => {
      const testUser = { id: 'user-uuid-123' };
      mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });
      mockGetChatById.mockResolvedValueOnce({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: testUser.id,
      });
      mockDeleteChatById.mockResolvedValueOnce({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: testUser.id,
      });

      const request = new Request(
        'http://localhost:3000/api/chat?id=550e8400-e29b-41d4-a716-446655440000',
        {
          method: 'DELETE',
        },
      );

      const response = await DELETE(request);
      expect(response.status).toBe(200);
      expect(mockDeleteChatById).toHaveBeenCalledWith({
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: testUser.id,
      });
    });
  });
});
