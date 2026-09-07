import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialList } from './material-list';

const mockUseMaterials = vi.fn();

vi.mock('@/lib/hooks/use-materials', () => ({
  useMaterials: (projectId: string) => mockUseMaterials(projectId),
}));

vi.mock('@/components/document/material-upload-dialog', () => ({
  // biome-ignore lint/style/useNamingConvention: Component mock export
  MaterialUploadDialog: () => <div data-testid="mock-upload-dialog" />,
}));

vi.mock('@/components/document/material-preview-dialog', () => ({
  // biome-ignore lint/style/useNamingConvention: Component mock export
  MaterialPreviewDialog: () => <div data-testid="mock-preview-dialog" />,
}));

vi.mock('@/components/document/delete-material-dialog', () => ({
  // biome-ignore lint/style/useNamingConvention: Component mock export
  DeleteMaterialDialog: () => <div data-testid="mock-delete-dialog" />,
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

  it('renders loading skeletons while materials are fetching', () => {
    mockUseMaterials.mockReturnValue({
      materials: [],
      isLoading: true,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialList projectId="proj-1" />);

    expect(html).toContain('animate-pulse');
    expect(html).not.toContain('No materials uploaded yet');
  });

  it('renders empty callout when project has no materials', () => {
    mockUseMaterials.mockReturnValue({
      materials: [],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialList projectId="proj-1" />);

    expect(html).toContain('No materials uploaded yet. Click to add.');
    expect(html).toContain('data-testid="empty-materials-list"');
  });

  it('renders material list items with title and status indicators', () => {
    mockUseMaterials.mockReturnValue({
      materials: [
        {
          id: 'mat-1',
          title: 'Calculus Syllabus.pdf',
          fileType: 'application/pdf',
          filename: 'syllabus.pdf',
          status: 'ready',
          metadata: {
            progress: { stage: 'completed' },
          },
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialList projectId="proj-1" />);

    expect(html).toContain('Calculus Syllabus.pdf');
    expect(html).toContain('data-testid="material-status-ready"');
    expect(html).toContain('data-testid="material-item-mat-1"');
  });

  it('renders extracting graph status indicator when material is currently extracting', () => {
    mockUseMaterials.mockReturnValue({
      materials: [
        {
          id: 'mat-1',
          title: 'Calculus Syllabus.pdf',
          fileType: 'application/pdf',
          filename: 'syllabus.pdf',
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

    expect(html).toContain('data-testid="material-extracting-graph-mat-1"');
  });

  it('renders Extract Concepts option in dropdown menu for ready materials', () => {
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

  it('does not render "Sync Graph" button by default in streamlined sidebar mode', () => {
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

    expect(html).not.toContain('data-testid="sync-graph-button"');
  });

  describe('Sync Graph Button', () => {
    it('renders "Sync Graph" button enabled in idle state with ready materials when showSyncGraph is true', () => {
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

      const html = renderToString(<MaterialList projectId="proj-1" showSyncGraph />);

      expect(html).toContain('data-testid="sync-graph-button"');
      expect(html).toContain('Sync Graph');
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

      const html = renderToString(<MaterialList projectId="proj-1" showSyncGraph />);

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

      const html = renderToString(<MaterialList projectId="proj-1" showSyncGraph />);

      expect(html).toContain('data-testid="sync-graph-button"');
      expect(html).toMatch(/<button[^>]*data-testid="sync-graph-button"[^>]*disabled/);
      expect(html).toContain('animate-spin');
    });
  });
});
