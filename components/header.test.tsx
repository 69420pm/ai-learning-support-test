import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Header } from './header';

const mockGetCurrentUser = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/components/theme/theme-toggle', () => ({
  // biome-ignore lint/style/useNamingConvention: Component mock exports
  ThemeToggle: () => (
    <button type="button" data-testid="header-theme-toggle">
      Theme Toggle
    </button>
  ),
}));

vi.mock('@/components/auth/user-nav', () => ({
  // biome-ignore lint/style/useNamingConvention: Component mock exports
  UserNav: ({ user }: { user: { email: string } }) => (
    <div data-testid="user-nav">{user.email}</div>
  ),
}));

describe('Header Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders theme switcher for unauthenticated (guest) visitors', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    const headerElement = await Header();
    const html = renderToString(headerElement);

    expect(html).toContain('data-testid="header-theme-toggle"');
    expect(html).toContain('Sign In');
    expect(html).toContain('Sign Up');
    expect(html).not.toContain('data-testid="user-nav"');
  });

  it('renders theme switcher for authenticated learners alongside user nav', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      id: 'learner-1',
      email: 'learner@example.com',
      fullName: 'Alex Learner',
    });

    const headerElement = await Header();
    const html = renderToString(headerElement);

    expect(html).toContain('data-testid="header-theme-toggle"');
    expect(html).toContain('data-testid="user-nav"');
    expect(html).toContain('learner@example.com');
    expect(html).not.toContain('Sign In');
  });
});
