import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SettingsPage from './page';

const mockGetCurrentUser = vi.fn();
const mockRedirect = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    mockRedirect(url);
    throw new Error(`REDIRECT:${url}`);
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/components/settings/profile-card', () => ({
  // biome-ignore lint/style/useNamingConvention: Mock component export
  ProfileCard: ({ user }: { user: { email: string; fullName?: string } }) => (
    <div data-testid="profile-card">{user.fullName || user.email}</div>
  ),
}));

vi.mock('@/components/settings/appearance-card', () => ({
  // biome-ignore lint/style/useNamingConvention: Mock component export
  AppearanceCard: () => <div data-testid="appearance-card">Appearance Settings</div>,
}));

describe('SettingsPage Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to login with redirectTo query param', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    await expect(SettingsPage()).rejects.toThrow('REDIRECT:/login?redirectTo=/settings');
    expect(mockRedirect).toHaveBeenCalledWith('/login?redirectTo=/settings');
  });

  it('renders settings dashboard for authenticated users', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      id: 'usr-1',
      email: 'alex@example.com',
      fullName: 'Alex Learner',
    });

    const pageElement = await SettingsPage();
    const html = renderToString(pageElement);

    expect(html).toContain('Settings');
    expect(html).toContain('data-testid="settings-heading"');
    expect(html).toContain('data-testid="profile-card"');
    expect(html).toContain('Alex Learner');
    expect(html).toContain('data-testid="appearance-card"');
  });
});
