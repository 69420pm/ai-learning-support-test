import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MaterialWorkbench } from './material-workbench';

const mockUseMaterials = vi.fn();

vi.mock('@/lib/hooks/use-materials', () => ({
  useMaterials: (projectId: string) => mockUseMaterials(projectId),
  calculateMaterialsRefreshInterval: vi.fn(),
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

describe('MaterialWorkbench Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state with skeleton pulse indicators', () => {
    mockUseMaterials.mockReturnValue({
      materials: [],
      isLoading: true,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialWorkbench projectId="proj-1" />);

    expect(html).toContain('data-testid="material-workbench"');
    expect(html).toContain('animate-pulse');
  });

  it('renders empty state when no materials are present', () => {
    mockUseMaterials.mockReturnValue({
      materials: [],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialWorkbench projectId="proj-1" />);

    expect(html).toContain('data-testid="material-workbench-empty"');
    expect(html).toContain('No learning materials uploaded yet');
  });

  it('renders workbench header toolbar with unclipped Upload Material and Sync Graph buttons', () => {
    mockUseMaterials.mockReturnValue({
      materials: [
        {
          id: 'mat-1',
          title: 'Deep Learning Notes',
          filename: 'dl.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
          status: 'ready',
          createdAt: '2026-08-20T10:00:00.000Z',
          metadata: { chunkCount: 4, tokenCount: 500 },
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialWorkbench projectId="proj-1" />);

    expect(html).toContain('data-testid="workbench-upload-button"');
    expect(html).toContain('data-testid="workbench-sync-graph-button"');
    expect(html).toContain('Upload Material');
    expect(html).toContain('Sync Graph');
  });

  it('renders drag-and-drop upload zone on the workbench', () => {
    mockUseMaterials.mockReturnValue({
      materials: [],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialWorkbench projectId="proj-1" />);

    expect(html).toContain('data-testid="workbench-dropzone"');
    expect(html).toContain('Drag &amp; drop materials here');
  });

  it('renders materials table with filename, chunks, status, and prominent action buttons', () => {
    mockUseMaterials.mockReturnValue({
      materials: [
        {
          id: 'mat-1',
          title: 'Calculus Syllabus',
          filename: 'calc.pdf',
          fileType: 'application/pdf',
          fileSize: 4096,
          status: 'ready',
          createdAt: '2026-08-20T10:00:00.000Z',
          metadata: {
            chunkCount: 12,
            tokenCount: 3200,
            graphExtraction: {
              status: 'ready',
              kcCount: 8,
              exerciseCount: 4,
            },
          },
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialWorkbench projectId="proj-1" />);

    expect(html).toContain('Calculus Syllabus');
    expect(html).toContain('calc.pdf');
    expect(html).toContain('12 Chunks');
    expect(html).toContain('8 KCs');
    expect(html).toContain('4 Exercises');
    expect(html).toContain('data-testid="inspect-material-btn-mat-1"');
    expect(html).toContain('data-testid="extract-concepts-btn-mat-1"');
    expect(html).toContain('data-testid="delete-material-btn-mat-1"');
  });

  it('renders granular ingestion progress with active stage and animated indicator during processing', () => {
    mockUseMaterials.mockReturnValue({
      materials: [
        {
          id: 'mat-processing',
          title: 'Physics Mechanics',
          filename: 'physics.pdf',
          fileType: 'application/pdf',
          fileSize: 8192,
          status: 'processing',
          createdAt: '2026-08-20T10:00:00.000Z',
          metadata: {
            progress: {
              stage: 'rasterizing',
              stagePercent: 40,
              currentPage: 2,
              totalPages: 5,
            },
          },
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialWorkbench projectId="proj-1" />);

    expect(html).toContain('data-testid="ingestion-stage-mat-processing"');
    expect(html).toContain('Rasterizing');
    expect(html).toContain('Page 2 of 5');
    expect(html).toContain('animate-spin');
  });

  it('renders granular progress for embedding stage', () => {
    mockUseMaterials.mockReturnValue({
      materials: [
        {
          id: 'mat-embedding',
          title: 'Biology Notes',
          filename: 'bio.md',
          fileType: 'text/markdown',
          fileSize: 1024,
          status: 'processing',
          createdAt: '2026-08-20T10:00:00.000Z',
          metadata: {
            progress: {
              stage: 'embedding',
              stagePercent: 75,
            },
          },
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialWorkbench projectId="proj-1" />);

    expect(html).toContain('Generating Embeddings');
    expect(html).toContain('75%');
  });

  it('renders Extracting Graph status when concept extraction is active', () => {
    mockUseMaterials.mockReturnValue({
      materials: [
        {
          id: 'mat-extracting',
          title: 'Algorithms & Data Structures',
          filename: 'algo.pdf',
          fileType: 'application/pdf',
          fileSize: 10240,
          status: 'ready',
          createdAt: '2026-08-20T10:00:00.000Z',
          metadata: {
            chunkCount: 20,
            graphExtraction: {
              status: 'extracting',
            },
          },
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialWorkbench projectId="proj-1" />);

    expect(html).toContain('data-testid="graph-extracting-mat-extracting"');
    expect(html).toContain('Extracting Graph...');
  });

  it('renders search input and status filter controls', () => {
    mockUseMaterials.mockReturnValue({
      materials: [],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialWorkbench projectId="proj-1" />);

    expect(html).toContain('data-testid="workbench-search-input"');
    expect(html).toContain('data-testid="workbench-status-filter"');
    expect(html).toContain('data-testid="workbench-sort-select"');
  });

  it('renders failed ingestion status with error message', () => {
    mockUseMaterials.mockReturnValue({
      materials: [
        {
          id: 'mat-failed',
          title: 'Corrupted File',
          filename: 'corrupted.pdf',
          fileType: 'application/pdf',
          fileSize: 512,
          status: 'failed',
          errorMessage: 'Corrupt PDF header',
          createdAt: '2026-08-20T10:00:00.000Z',
          metadata: {
            error: {
              message: 'Corrupt PDF header',
              stage: 'rasterizing',
            },
          },
        },
      ],
      isLoading: false,
      mutate: vi.fn(),
    });

    const html = renderToString(<MaterialWorkbench projectId="proj-1" />);

    expect(html).toContain('data-testid="material-status-failed-mat-failed"');
    expect(html).toContain('Corrupt PDF header');
  });
});
