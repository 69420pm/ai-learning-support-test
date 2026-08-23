import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppearanceCard, THEME_PREVIEW_OPTIONS } from '@/components/settings/appearance-card';
import { ProfileCard } from '@/components/settings/profile-card';

const mockSetTheme = vi.fn();
const mockUpdateThemePreference = vi.fn().mockResolvedValue({ success: true, theme: 'dark' });
let mockTheme = 'system';
let mockResolvedTheme = 'light';

vi.mock('@/app/actions/theme', () => ({
  updateThemePreference: (theme: string) => mockUpdateThemePreference(theme),
}));

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
    resolvedTheme: mockResolvedTheme,
    themes: ['light', 'dark', 'system'],
  }),
}));

describe('Settings Components Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'system';
    mockResolvedTheme = 'light';
  });

  describe('ProfileCard', () => {
    it('renders learner profile information correctly', () => {
      const user = {
        email: 'learner@example.com',
        fullName: 'Ada Lovelace',
      };

      const html = renderToString(<ProfileCard user={user} />);

      expect(html).toContain('Ada Lovelace');
      expect(html).toContain('learner@example.com');
      expect(html).toContain('AL');
      expect(html).toContain('Learner');
    });

    it('falls back to email initials when full name is missing', () => {
      const user = {
        email: 'grace.hopper@navy.mil',
      };

      const html = renderToString(<ProfileCard user={user} />);

      expect(html).toContain('grace.hopper@navy.mil');
      expect(html).toContain('GR');
    });
  });

  describe('AppearanceCard', () => {
    it('renders all 3 theme preview options (system, light, dark)', () => {
      const html = renderToString(<AppearanceCard />);

      expect(html).toContain('data-testid="theme-option-system"');
      expect(html).toContain('data-testid="theme-option-light"');
      expect(html).toContain('data-testid="theme-option-dark"');
      expect(THEME_PREVIEW_OPTIONS).toHaveLength(3);
    });

    it('persists theme preference changes', async () => {
      const { updateThemePreference } = await import('@/app/actions/theme');
      const res = await updateThemePreference('dark');

      expect(res).toEqual({ success: true, theme: 'dark' });
      expect(mockUpdateThemePreference).toHaveBeenCalledWith('dark');
    });
  });
});
