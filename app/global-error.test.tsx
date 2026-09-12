import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GlobalError from './global-error';

describe('Global Error Boundary (app/global-error.tsx)', () => {
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders complete html and body document shell on root crash', () => {
    const error = new Error('Critical root layout failure') as Error & { digest?: string };
    error.digest = 'GLOBAL_CRASH_99';

    const html = renderToString(<GlobalError error={error} reset={mockReset} />);

    expect(html).toContain('<html');
    expect(html).toContain('<body');
    expect(html).toContain('Critical Application Error');
    expect(html).toContain('Critical root layout failure');
    expect(html).toContain('GLOBAL_CRASH_99');
    expect(html).toContain('data-testid="global-error-retry"');
  });

  it('provides default message when crash error is blank', () => {
    const error = new Error('') as Error & { digest?: string };

    const html = renderToString(<GlobalError error={error} reset={mockReset} />);

    expect(html).toContain('A critical layout error interrupted the application.');
    expect(html).toContain('data-testid="global-error-retry"');
  });
});
