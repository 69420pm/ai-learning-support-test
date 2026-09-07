import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { KnowledgeGraphWorkbench } from './knowledge-graph-workbench';

const mockUseProjectGraph = vi.fn();

vi.mock('@/lib/hooks/use-project-graph', () => ({
  useProjectGraph: (projectId: string) => mockUseProjectGraph(projectId),
  calculateGraphRefreshInterval: vi.fn(),
}));

describe('KnowledgeGraphWorkbench Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state when initial data is loading', () => {
    mockUseProjectGraph.mockReturnValue({
      components: [],
      dependencies: [],
      materials: [],
      isLoading: true,
      mutate: vi.fn(),
    });

    const html = renderToString(<KnowledgeGraphWorkbench projectId="p-123" />);
    expect(html).toContain('data-testid="graph-loading-state"');
    expect(html).toContain('animate-spin');
  });

  it('renders empty progressive guidance card when project has no materials', () => {
    mockUseProjectGraph.mockReturnValue({
      components: [],
      dependencies: [],
      materials: [],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<KnowledgeGraphWorkbench projectId="p-123" />);
    expect(html).toContain('data-testid="graph-empty-state"');
    expect(html).toContain('No Learning Materials Found');
    expect(html).toContain('href="/projects/p-123/materials"');
  });

  it('renders ready-to-extract card when materials exist but no graph components have been extracted', () => {
    mockUseProjectGraph.mockReturnValue({
      components: [],
      dependencies: [],
      materials: [
        {
          id: 'mat-1',
          title: 'Calculus Syllabus.pdf',
          status: 'ready',
          metadata: {},
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<KnowledgeGraphWorkbench projectId="p-123" />);
    expect(html).toContain('data-testid="graph-ready-state"');
    expect(html).toContain('Generate Knowledge Graph');
    expect(html).toContain('data-testid="generate-graph-button"');
  });

  it('renders active extracting state when extraction is in-flight', () => {
    mockUseProjectGraph.mockReturnValue({
      components: [],
      dependencies: [],
      materials: [
        {
          id: 'mat-1',
          title: 'Calculus Syllabus.pdf',
          status: 'ready',
          metadata: {
            graphExtraction: {
              status: 'extracting',
            },
          },
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<KnowledgeGraphWorkbench projectId="p-123" />);
    expect(html).toContain('data-testid="graph-extracting-state"');
    expect(html).toContain('Extracting Knowledge Graph');
  });

  it('renders populated canvas and toolbar when graph components exist', () => {
    mockUseProjectGraph.mockReturnValue({
      components: [
        {
          id: 'kc-1',
          name: 'Limits and Continuity',
          pacerCategory: 'conceptual',
          bloomLevel: 2,
          sourceMaterialId: 'mat-1',
        },
        {
          id: 'kc-2',
          name: 'Derivative Definition',
          pacerCategory: 'procedural',
          bloomLevel: 3,
          sourceMaterialId: 'mat-1',
        },
      ],
      dependencies: [
        {
          id: 'kd-1',
          sourceKcId: 'kc-1',
          targetKcId: 'kc-2',
          relationshipType: 'prerequisite',
        },
      ],
      materials: [
        {
          id: 'mat-1',
          title: 'Calculus Syllabus.pdf',
          status: 'ready',
          metadata: { graphExtraction: { status: 'ready', kcCount: 2 } },
        },
      ],
      diagnostics: {
        totalComponents: 2,
        nodeCount: 2,
        totalDependencies: 1,
        edgeCount: 1,
        orphanCount: 0,
        hasCycles: false,
        cyclePaths: [],
        pacerDistribution: {
          conceptual: 1,
          procedural: 1,
          analogous: 0,
          evidence: 0,
          reference: 0,
        },
        bloomDistribution: { 1: 0, 2: 1, 3: 1, 4: 0, 5: 0, 6: 0 },
      },
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<KnowledgeGraphWorkbench projectId="p-123" />);
    expect(html).toContain('data-testid="knowledge-graph-workbench"');
    expect(html).toContain('data-testid="graph-toolbar"');
    expect(html).toContain('data-testid="graph-canvas"');
    expect(html).toContain('data-testid="graph-search-input"');
    expect(html).toContain('data-testid="graph-pacer-filter"');
    expect(html).toContain('data-testid="graph-material-filter"');
    expect(html).toContain('data-testid="graph-layout-toggle"');
    expect(html).toContain('data-testid="graph-zoom-in"');
    expect(html).toContain('data-testid="graph-zoom-out"');
    expect(html).toContain('data-testid="graph-fit-view"');
    expect(html).toContain('data-testid="graph-resync-button"');
    expect(html).toContain('Limits and Continuity');
    expect(html).toContain('Derivative Definition');
  });
});
