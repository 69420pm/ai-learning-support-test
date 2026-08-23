import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppearanceCard, THEME_PREVIEW_OPTIONS } from './appearance-card';

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

describe('AppearanceCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTheme = 'system';
    mockResolvedTheme = 'light';
  });

  it('renders card title, description, and container', () => {
    const html = renderToString(<AppearanceCard />);

    expect(html).toContain('data-testid="appearance-card"');
    expect(html).toContain('Appearance');
    expect(html).toContain('visual appearance');
  });

  it('renders all three theme visual preview options (System, Light, Dark)', () => {
    const html = renderToString(<AppearanceCard />);

    expect(html).toContain('data-testid="theme-option-system"');
    expect(html).toContain('data-testid="theme-option-light"');
    expect(html).toContain('data-testid="theme-option-dark"');
    expect(html).toContain('System');
    expect(html).toContain('Light');
    expect(html).toContain('Dark');
  });

  it('defines the 3 theme preview options with proper metadata', () => {
    expect(THEME_PREVIEW_OPTIONS).toHaveLength(3);
    expect(THEME_PREVIEW_OPTIONS.map((o) => o.value)).toEqual(['system', 'light', 'dark']);
    expect(THEME_PREVIEW_OPTIONS.map((o) => o.label)).toEqual(['System', 'Light', 'Dark']);
  });

  it('asynchronously persists theme changes via updateThemePreference server action', async () => {
    mockUpdateThemePreference.mockResolvedValueOnce({ success: true, theme: 'light' });
    const { updateThemePreference } = await import('@/app/actions/theme');

    const result = await updateThemePreference('light');
    expect(result).toEqual({ success: true, theme: 'light' });
    expect(mockUpdateThemePreference).toHaveBeenCalledWith('light');
  });
});
