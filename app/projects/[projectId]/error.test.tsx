import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectWorkspaceError from './error';

describe('Project Workspace Error Boundary (app/projects/[projectId]/error.tsx)', () => {
  const mockReset = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders scoped workspace error with retry and back-to-projects navigation', () => {
    const error = new Error('Knowledge graph failed to compute layout') as Error & {
      digest?: string;
    };
    error.digest = 'PROJ_ERR_404';

    const html = renderToString(<ProjectWorkspaceError error={error} reset={mockReset} />);

    expect(html).toContain('Workspace Error');
    expect(html).toContain('Knowledge graph failed to compute layout');
    expect(html).toContain('PROJ_ERR_404');
    expect(html).toContain('data-testid="project-error-retry"');
    expect(html).toContain('data-testid="project-error-back-link"');
    expect(html).toContain('href="/projects"');
  });

  it('provides default explanation when error message is empty', () => {
    const error = new Error('') as Error & { digest?: string };

    const html = renderToString(<ProjectWorkspaceError error={error} reset={mockReset} />);

    expect(html).toContain('Unable to load this project workspace.');
    expect(html).toContain('data-testid="project-error-retry"');
  });
});
