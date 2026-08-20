import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

// Mock dependencies
const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockImplementation(async () => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

const mockGetChatsByUserId = vi.fn();
vi.mock('@/lib/db/queries/chat', () => ({
  getChatsByUserId: (...args: unknown[]) => mockGetChatsByUserId(...args),
}));

describe('History API Handler (/api/history)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 Unauthorized when session is unauthenticated', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

    const request = new Request('http://localhost:3000/api/history');
    const response = await GET(request);

    expect(response.status).toBe(401);
    const json = await response.json();
    expect(json.code).toBe('unauthorized:chat');
  });

  it('returns user chat history when authenticated', async () => {
    const testUser = { id: 'user-uuid-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });
    const mockChats = [
      { id: 'chat-1', userId: testUser.id, title: 'Chat 1', createdAt: new Date() },
      { id: 'chat-2', userId: testUser.id, title: 'Chat 2', createdAt: new Date() },
    ];
    mockGetChatsByUserId.mockResolvedValueOnce({ chats: mockChats, hasMore: false });

    const request = new Request('http://localhost:3000/api/history?limit=10');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.chats).toHaveLength(2);
    expect(mockGetChatsByUserId).toHaveBeenCalledWith({
      userId: testUser.id,
      projectId: undefined,
      limit: 10,
      startingAfter: null,
      endingBefore: null,
    });
  });

  it('filters by projectId when query parameter is provided', async () => {
    const testUser = { id: 'user-uuid-123', email: 'test@example.com' };
    mockGetUser.mockResolvedValueOnce({ data: { user: testUser }, error: null });
    const mockChats = [
      {
        id: 'chat-1',
        userId: testUser.id,
        projectId: 'proj-1',
        title: 'Chat 1',
        createdAt: new Date(),
      },
    ];
    mockGetChatsByUserId.mockResolvedValueOnce({ chats: mockChats, hasMore: false });

    const request = new Request('http://localhost:3000/api/history?projectId=proj-1');
    const response = await GET(request);

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.chats).toHaveLength(1);
    expect(mockGetChatsByUserId).toHaveBeenCalledWith({
      userId: testUser.id,
      projectId: 'proj-1',
      limit: undefined,
      startingAfter: null,
      endingBefore: null,
    });
  });
});
