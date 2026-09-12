import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import RouteError from './error';

describe('Route Error Boundary (app/error.tsx)', () => {
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders error presentation with message and retry CTA', () => {
    const error = new Error('Failed to load dashboard data') as Error & { digest?: string };
    error.digest = 'ERR_DIGEST_123';

    const html = renderToString(<RouteError error={error} reset={mockReset} />);

    expect(html).toContain('Something went wrong');
    expect(html).toContain('Failed to load dashboard data');
    expect(html).toContain('ERR_DIGEST_123');
    expect(html).toContain('data-testid="error-retry-button"');
    expect(html).toContain('data-testid="error-home-link"');
    expect(html).toContain('href="/projects"');
  });

  it('provides generic fallback message when error has no message', () => {
    const error = new Error('') as Error & { digest?: string };

    const html = renderToString(<RouteError error={error} reset={mockReset} />);

    expect(html).toContain('An unexpected error occurred while loading this page.');
    expect(html).toContain('data-testid="error-retry-button"');
  });

  it('renders alert role for accessibility', () => {
    const error = new Error('Network error');
    const html = renderToString(<RouteError error={error} reset={mockReset} />);

    expect(html).toContain('role="alert"');
  });
});
