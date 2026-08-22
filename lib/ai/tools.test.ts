import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTools, type DataStreamWriter } from './tools';

const mockRetrieveMaterials = vi.fn();
vi.mock('@/lib/materials', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/materials')>();
  return {
    ...actual,
    retrieveMaterials: (...args: unknown[]) => mockRetrieveMaterials(...args),
  };
});

describe('AI Tools Registry (createTools)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates searchProjectMaterials tool with proper schema and description', () => {
    const tools = createTools({
      projectId: 'proj-1',
      userId: 'user-1',
    });

    expect(tools).toHaveProperty('searchProjectMaterials');
    expect(tools.searchProjectMaterials.description).toContain('material');
  });

  it('executes searchProjectMaterials and emits dataStream status events', async () => {
    const mockDataStream: DataStreamWriter = {
      write: vi.fn(),
    };

    const mockResult = {
      query: 'mitochondria function',
      results: [
        {
          id: 'chunk-1',
          materialId: 'mat-1',
          projectId: 'proj-1',
          materialTitle: 'Biology 101',
          filename: 'bio.pdf',
          fileType: 'application/pdf',
          pageNumber: 5,
          chunkIndex: 0,
          similarity: 0.88,
          content: 'Mitochondria is the powerhouse of the cell.',
        },
      ],
      totalResults: 1,
    };

    mockRetrieveMaterials.mockResolvedValueOnce(mockResult);

    const tools = createTools({
      projectId: 'proj-1',
      userId: 'user-1',
      dataStream: mockDataStream,
    });

    const output = await tools.searchProjectMaterials.execute(
      { query: 'mitochondria function' },
      { toolCallId: 'tc-1', messages: [], context: {} },
    );

    expect(mockRetrieveMaterials).toHaveBeenCalledWith({
      projectId: 'proj-1',
      query: 'mitochondria function',
      embeddingOptions: undefined,
    });

    expect(mockDataStream.write).toHaveBeenCalledWith({
      type: 'data-tool-status',
      data: {
        tool: 'searchProjectMaterials',
        status: 'searching',
        query: 'mitochondria function',
      },
    });

    expect(mockDataStream.write).toHaveBeenCalledWith({
      type: 'data-tool-status',
      data: {
        tool: 'searchProjectMaterials',
        status: 'completed',
        query: 'mitochondria function',
        resultCount: 1,
      },
    });

    expect(output).toEqual(mockResult);
  });

  it('passes BYOK credentials and embedding options to retrieveMaterials', async () => {
    const mockDataStream: DataStreamWriter = {
      write: vi.fn(),
    };

    mockRetrieveMaterials.mockResolvedValueOnce({
      query: 'photosynthesis',
      results: [],
      totalResults: 0,
    });

    const tools = createTools({
      projectId: 'proj-1',
      userId: 'user-1',
      provider: 'google',
      apiKey: 'test-google-api-key',
      dataStream: mockDataStream,
    });

    await tools.searchProjectMaterials.execute(
      { query: 'photosynthesis' },
      { toolCallId: 'tc-2', messages: [], context: {} },
    );

    expect(mockRetrieveMaterials).toHaveBeenCalledWith({
      projectId: 'proj-1',
      query: 'photosynthesis',
      embeddingOptions: {
        provider: 'google',
        apiKey: 'test-google-api-key',
      },
    });
  });

  it('handles missing projectId gracefully without calling retrieveMaterials', async () => {
    const mockDataStream: DataStreamWriter = { write: vi.fn() };
    const tools = createTools({
      userId: 'user-1',
      dataStream: mockDataStream,
    });

    const output = (await tools.searchProjectMaterials.execute(
      { query: 'any query' },
      { toolCallId: 'tc-3', messages: [], context: {} },
    )) as { error: string; results: unknown[] };

    expect(output.error).toContain('No project context');
    expect(output.results).toEqual([]);
    expect(mockRetrieveMaterials).not.toHaveBeenCalled();
  });

  it('handles search failures and emits error status', async () => {
    const mockDataStream: DataStreamWriter = { write: vi.fn() };
    mockRetrieveMaterials.mockRejectedValueOnce(new Error('Vector search failed'));

    const tools = createTools({
      projectId: 'proj-1',
      userId: 'user-1',
      dataStream: mockDataStream,
    });

    const output = (await tools.searchProjectMaterials.execute(
      { query: 'error test' },
      { toolCallId: 'tc-4', messages: [], context: {} },
    )) as { error: string; results: unknown[] };

    expect(mockDataStream.write).toHaveBeenCalledWith({
      type: 'data-tool-status',
      data: {
        tool: 'searchProjectMaterials',
        status: 'error',
        query: 'error test',
        error: 'Vector search failed',
      },
    });

    expect(output.error).toBe('Vector search failed');
    expect(output.results).toEqual([]);
  });
});
