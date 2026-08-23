import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ProfileCard } from './profile-card';

describe('ProfileCard Component', () => {
  it('renders learner profile name, email, and fallback avatar initials', () => {
    const user = {
      id: 'learner-123',
      email: 'learner@example.com',
      fullName: 'Marie Curie',
    };

    const html = renderToString(<ProfileCard user={user} />);

    expect(html).toContain('data-testid="profile-card"');
    expect(html).toContain('data-testid="profile-name"');
    expect(html).toContain('Marie Curie');
    expect(html).toContain('data-testid="profile-email"');
    expect(html).toContain('learner@example.com');
    expect(html).toContain('MC'); // Fallback initials
    expect(html).toContain('Learner');
  });

  it('renders email as name fallback when fullName is missing', () => {
    const user = {
      id: 'learner-456',
      email: 'newuser@domain.com',
    };

    const html = renderToString(<ProfileCard user={user} />);

    expect(html).toContain('newuser@domain.com');
    expect(html).toContain('NE'); // Fallback initials from email
  });

  it('renders learner role badge and profile details', () => {
    const user = {
      id: 'learner-789',
      email: 'avatar@example.com',
      fullName: 'Avatar User',
      avatarUrl: 'https://example.com/avatar.png',
    };

    const html = renderToString(<ProfileCard user={user} />);

    expect(html).toContain('Avatar User');
    expect(html).toContain('avatar@example.com');
    expect(html).toContain('AU');
    expect(html).toContain('Learner');
  });
});
