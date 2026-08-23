import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import { getProfileByUserId, updateProfileTheme } from './profile';

// Mock Drizzle DB instance
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    select: (...args: unknown[]) => mockSelect(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

describe('Profile DB Queries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProfileTheme', () => {
    it('updates and returns the profile with new theme preference', async () => {
      const updatedProfile = {
        id: 'user-uuid-1',
        email: 'learner@example.com',
        fullName: 'Learner One',
        avatarUrl: null,
        theme: 'dark' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([updatedProfile]),
          }),
        }),
      });

      const result = await updateProfileTheme({
        userId: 'user-uuid-1',
        theme: 'dark',
      });

      expect(result).toEqual(updatedProfile);
    });

    it('throws ChatbotError when profile is not found', async () => {
      mockUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockResolvedValueOnce([]),
          }),
        }),
      });

      await expect(
        updateProfileTheme({
          userId: 'non-existent-user',
          theme: 'dark',
        }),
      ).rejects.toThrow(ChatbotError);
    });

    it('throws ChatbotError when database operation fails', async () => {
      mockUpdate.mockReturnValueOnce({
        set: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockReturnValueOnce({
            returning: vi.fn().mockRejectedValueOnce(new Error('DB Connection Lost')),
          }),
        }),
      });

      await expect(
        updateProfileTheme({
          userId: 'user-uuid-1',
          theme: 'system',
        }),
      ).rejects.toThrow(ChatbotError);
    });
  });

  describe('getProfileByUserId', () => {
    it('returns a profile by userId', async () => {
      const mockProfile = {
        id: 'user-uuid-1',
        email: 'learner@example.com',
        fullName: 'Learner One',
        avatarUrl: null,
        theme: 'light' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([mockProfile]),
        }),
      });

      const result = await getProfileByUserId({ userId: 'user-uuid-1' });
      expect(result).toEqual(mockProfile);
    });

    it('returns null when profile is not found', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockResolvedValueOnce([]),
        }),
      });

      const result = await getProfileByUserId({ userId: 'non-existent' });
      expect(result).toBeNull();
    });

    it('throws ChatbotError on database error', async () => {
      mockSelect.mockReturnValueOnce({
        from: vi.fn().mockReturnValueOnce({
          where: vi.fn().mockRejectedValueOnce(new Error('DB Query Error')),
        }),
      });

      await expect(getProfileByUserId({ userId: 'user-uuid-1' })).rejects.toThrow(ChatbotError);
    });
  });
});
