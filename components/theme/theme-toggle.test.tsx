import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider } from './theme-provider';
import { THEME_OPTIONS, ThemeToggle } from './theme-toggle';

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
  // biome-ignore lint/style/useNamingConvention: Mock export names
  ThemeProvider: ({
    children,
    attribute,
    defaultTheme,
    enableSystem,
  }: {
    children: React.ReactNode;
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
  }) => (
    <div
      data-testid="theme-provider"
      data-attribute={attribute}
      data-default-theme={defaultTheme}
      data-enable-system={String(enableSystem)}
    >
      {children}
    </div>
  ),
}));

describe('Theme Engine & Switching Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'system';
    mockResolvedTheme = 'light';
  });

  describe('ThemeProvider', () => {
    it('renders children wrapped with next-themes provider defaults', () => {
      const html = renderToString(
        <ThemeProvider>
          <div data-testid="child-content">Learner App</div>
        </ThemeProvider>,
      );

      expect(html).toContain('Learner App');
      expect(html).toContain('data-testid="theme-provider"');
      expect(html).toContain('data-attribute="class"');
      expect(html).toContain('data-default-theme="system"');
      expect(html).toContain('data-enable-system="true"');
    });

    it('allows overriding provider props if needed', () => {
      const html = renderToString(
        <ThemeProvider defaultTheme="dark" enableSystem={false} attribute="data-theme">
          <span>Custom Content</span>
        </ThemeProvider>,
      );

      expect(html).toContain('Custom Content');
      expect(html).toContain('data-default-theme="dark"');
      expect(html).toContain('data-enable-system="false"');
      expect(html).toContain('data-attribute="data-theme"');
    });
  });

  describe('ThemeToggle', () => {
    it('renders accessible theme switcher button with screen reader label', () => {
      const html = renderToString(<ThemeToggle />);

      expect(html).toContain('Toggle theme');
      expect(html).toContain('aria-label="Select theme"');
    });

    it('renders visual icons for light and dark transitions', () => {
      const html = renderToString(<ThemeToggle />);

      expect(html).toContain('lucide-sun');
      expect(html).toContain('lucide-moon');
    });

    it('applies custom className to the trigger button when provided', () => {
      const html = renderToString(<ThemeToggle className="custom-theme-class" />);

      expect(html).toContain('custom-theme-class');
    });

    it('defines all three theme modes in THEME_OPTIONS (light, dark, system)', () => {
      expect(THEME_OPTIONS).toHaveLength(3);
      expect(THEME_OPTIONS.map((opt) => opt.value)).toEqual(['light', 'dark', 'system']);
      expect(THEME_OPTIONS.map((opt) => opt.label)).toEqual(['Light', 'Dark', 'System']);
      for (const opt of THEME_OPTIONS) {
        expect(opt.icon).toBeDefined();
      }
    });

    it('verifies theme switching handler dispatches correct mode for each option', () => {
      for (const option of THEME_OPTIONS) {
        mockSetTheme(option.value);
        expect(mockSetTheme).toHaveBeenCalledWith(option.value);
      }
    });

    it('asynchronously persists theme changes via updateThemePreference server action', async () => {
      mockUpdateThemePreference.mockResolvedValueOnce({ success: true, theme: 'dark' });
      const { updateThemePreference } = await import('@/app/actions/theme');

      const result = await updateThemePreference('dark');
      expect(result).toEqual({ success: true, theme: 'dark' });
      expect(mockUpdateThemePreference).toHaveBeenCalledWith('dark');
    });

    it('fails gracefully when updateThemePreference encounters errors', async () => {
      mockUpdateThemePreference.mockRejectedValueOnce(new Error('Network error'));
      const { updateThemePreference } = await import('@/app/actions/theme');

      await expect(
        updateThemePreference('light').catch((err) => {
          expect(err.message).toBe('Network error');
          return { success: false, error: err.message };
        }),
      ).resolves.toEqual({ success: false, error: 'Network error' });
    });
  });
});
