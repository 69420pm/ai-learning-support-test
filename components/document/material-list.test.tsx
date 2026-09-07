import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialList } from './material-list';

const mockUseMaterials = vi.fn();
vi.mock('@/lib/hooks/use-materials', () => ({
  useMaterials: (...args: unknown[]) => mockUseMaterials(...args),
}));

// Mock Dialogs to avoid Radix Portal / DOM issues in SSR
vi.mock('@/components/document/delete-material-dialog', () => ({
  // biome-ignore lint/style/useNamingConvention: React mock component export
  DeleteMaterialDialog: () => null,
}));
vi.mock('@/components/document/material-preview-dialog', () => ({
  // biome-ignore lint/style/useNamingConvention: React mock component export
  MaterialPreviewDialog: () => null,
}));
vi.mock('@/components/document/material-upload-dialog', () => ({
  // biome-ignore lint/style/useNamingConvention: React mock component export
  MaterialUploadDialog: () => null,
}));

// Mock DropdownMenu components so items render inline for SSR testing
vi.mock('@/components/ui/dropdown-menu', () => ({
  // biome-ignore lint/style/useNamingConvention: React mock component export
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  // biome-ignore lint/style/useNamingConvention: React mock component export
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  // biome-ignore lint/style/useNamingConvention: React mock component export
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  // biome-ignore lint/style/useNamingConvention: React mock component export
  DropdownMenuItem: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => <div {...props}>{children}</div>,
  // biome-ignore lint/style/useNamingConvention: React mock component export
  DropdownMenuSeparator: () => <hr />,
}));

describe('MaterialList Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Extracting Graph..." badge with spinner when graphExtraction.status is queued or extracting', () => {
    mockUseMaterials.mockReturnValue({
      materials: [
        {
          id: 'mat-1',
          title: 'Graph Theory.pdf',
          fileType: 'application/pdf',
          filename: 'graph.pdf',
          status: 'ready',
          metadata: {
            graphExtraction: {
              status: 'extracting',
            },
          },
        },
        {
          id: 'mat-2',
          title: 'Algorithms.md',
          fileType: 'text/markdown',
          filename: 'algo.md',
          status: 'ready',
          metadata: {
            graphExtraction: {
              status: 'queued',
            },
          },
        },
        {
          id: 'mat-3',
          title: 'Calculus.pdf',
          fileType: 'application/pdf',
          filename: 'calc.pdf',
          status: 'ready',
          metadata: {},
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialList projectId="proj-1" />);

    expect(html).toContain('Extracting Graph...');
    expect(html).toContain('material-extracting-graph-mat-1');
    expect(html).toContain('material-extracting-graph-mat-2');
    expect(html).not.toContain('material-extracting-graph-mat-3');
  });

  it('renders "Extract Concepts" action item in dropdown menu', () => {
    mockUseMaterials.mockReturnValue({
      materials: [
        {
          id: 'mat-1',
          title: 'Physics.pdf',
          fileType: 'application/pdf',
          filename: 'physics.pdf',
          status: 'ready',
          metadata: {},
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialList projectId="proj-1" />);

    expect(html).toContain('Extract Concepts');
    expect(html).toContain('extract-concepts-option-mat-1');
  });

  describe('Sync Graph Button', () => {
    it('renders "Sync Graph" button enabled in idle state with ready materials', () => {
      mockUseMaterials.mockReturnValue({
        materials: [
          {
            id: 'mat-1',
            title: 'Doc.pdf',
            fileType: 'application/pdf',
            filename: 'doc.pdf',
            status: 'ready',
            metadata: {},
          },
        ],
        isLoading: false,
        mutate: vi.fn(),
      });

      const html = renderToString(<MaterialList projectId="proj-1" />);

      expect(html).toContain('data-testid="sync-graph-button"');
      expect(html).toContain('Sync Graph');
      // In idle state, button should not have disabled attribute and should not have animate-spin on sync button
      expect(html).toMatch(/<button[^>]*data-testid="sync-graph-button"(?![^>]*disabled)[^>]*>/);
    });

    it('renders "Sync Graph" button disabled with spinning indicator when any material is extracting', () => {
      mockUseMaterials.mockReturnValue({
        materials: [
          {
            id: 'mat-1',
            title: 'Doc.pdf',
            fileType: 'application/pdf',
            filename: 'doc.pdf',
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

      const html = renderToString(<MaterialList projectId="proj-1" />);

      expect(html).toContain('data-testid="sync-graph-button"');
      expect(html).toMatch(/<button[^>]*data-testid="sync-graph-button"[^>]*disabled/);
      expect(html).toContain('animate-spin');
    });

    it('renders "Sync Graph" button disabled with spinning indicator when any material is queued', () => {
      mockUseMaterials.mockReturnValue({
        materials: [
          {
            id: 'mat-1',
            title: 'Doc.pdf',
            fileType: 'application/pdf',
            filename: 'doc.pdf',
            status: 'ready',
            metadata: {
              graphExtraction: {
                status: 'queued',
              },
            },
          },
        ],
        isLoading: false,
        mutate: vi.fn(),
      });

      const html = renderToString(<MaterialList projectId="proj-1" />);

      expect(html).toContain('data-testid="sync-graph-button"');
      expect(html).toMatch(/<button[^>]*data-testid="sync-graph-button"[^>]*disabled/);
      expect(html).toContain('animate-spin');
    });
  });
});
