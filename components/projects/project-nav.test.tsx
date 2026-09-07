import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectNav } from './project-nav';

const mockUsePathname = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => mockUsePathname(),
}));

describe('ProjectNav Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders project name, back to projects link, and all 3 workspace tabs', () => {
    mockUsePathname.mockReturnValue('/projects/proj-123/chat');

    const html = renderToString(
      <ProjectNav projectId="proj-123" projectName="Organic Chemistry" />,
    );

    expect(html).toContain('Organic Chemistry');
    expect(html).toContain('data-testid="project-nav-back"');
    expect(html).toContain('data-testid="project-nav-chat"');
    expect(html).toContain('data-testid="project-nav-graph"');
    expect(html).toContain('data-testid="project-nav-materials"');
    expect(html).toContain('href="/projects/proj-123/chat"');
    expect(html).toContain('href="/projects/proj-123/graph"');
    expect(html).toContain('href="/projects/proj-123/materials"');
  });

  it('highlights chat tab when active', () => {
    mockUsePathname.mockReturnValue('/projects/proj-123/chat');

    const html = renderToString(<ProjectNav projectId="proj-123" projectName="Linear Algebra" />);

    expect(html).toContain('aria-selected="true"');
    // Chat tab has aria-selected="true"
    const chatSelected = html.includes(
      'data-testid="project-nav-chat" class="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all bg-background text-foreground shadow-sm"',
    );
    expect(chatSelected).toBe(true);
  });

  it('highlights knowledge graph tab when on graph route', () => {
    mockUsePathname.mockReturnValue('/projects/proj-123/graph');

    const html = renderToString(<ProjectNav projectId="proj-123" projectName="Linear Algebra" />);

    const graphSelected = html.includes(
      'data-testid="project-nav-graph" class="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all bg-background text-foreground shadow-sm"',
    );
    expect(graphSelected).toBe(true);
  });

  it('highlights materials tab when on materials route', () => {
    mockUsePathname.mockReturnValue('/projects/proj-123/materials');

    const html = renderToString(<ProjectNav projectId="proj-123" projectName="Linear Algebra" />);

    const materialsSelected = html.includes(
      'data-testid="project-nav-materials" class="flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-all bg-background text-foreground shadow-sm"',
    );
    expect(materialsSelected).toBe(true);
  });
});
