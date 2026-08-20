import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTools, type DataStreamWriter } from './tools';

const mockSearchMaterialChunks = vi.fn();
vi.mock('@/lib/db/queries/material', () => ({
  searchMaterialChunks: (...args: unknown[]) => mockSearchMaterialChunks(...args),
}));

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

    const mockResults = [
      {
        id: 'chunk-1',
        materialId: 'mat-1',
        projectId: 'proj-1',
        materialTitle: 'Biology 101',
        filename: 'bio.pdf',
        fileType: 'application/pdf',
        chunkIndex: 0,
        content: 'Mitochondria is the powerhouse of the cell.',
        similarity: 0.88,
        metadata: { pageNumber: 5 },
      },
    ];

    mockSearchMaterialChunks.mockResolvedValueOnce(mockResults);

    const tools = createTools({
      projectId: 'proj-1',
      userId: 'user-1',
      dataStream: mockDataStream,
    });

    const output = await tools.searchProjectMaterials.execute(
      { query: 'mitochondria function' },
      { toolCallId: 'tc-1', messages: [], context: {} },
    );

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

    expect(output).toEqual({
      query: 'mitochondria function',
      results: [
        {
          materialId: 'mat-1',
          materialTitle: 'Biology 101',
          pageNumber: 5,
          chunkIndex: 0,
          similarity: 0.88,
          content: 'Mitochondria is the powerhouse of the cell.',
        },
      ],
      totalResults: 1,
    });
  });

  it('enforces 8,000 character output safety cap on combined chunk content', async () => {
    const longText1 = 'A'.repeat(5000);
    const longText2 = 'B'.repeat(5000);

    mockSearchMaterialChunks.mockResolvedValueOnce([
      {
        id: 'chunk-1',
        materialId: 'mat-1',
        projectId: 'proj-1',
        materialTitle: 'Doc 1',
        filename: 'doc1.pdf',
        fileType: 'application/pdf',
        chunkIndex: 0,
        content: longText1,
        similarity: 0.9,
        metadata: { pageNumber: 1 },
      },
      {
        id: 'chunk-2',
        materialId: 'mat-2',
        projectId: 'proj-1',
        materialTitle: 'Doc 2',
        filename: 'doc2.pdf',
        fileType: 'application/pdf',
        chunkIndex: 1,
        content: longText2,
        similarity: 0.85,
        metadata: { pageNumber: 2 },
      },
    ]);

    const tools = createTools({
      projectId: 'proj-1',
      userId: 'user-1',
    });

    const output = (await tools.searchProjectMaterials.execute(
      { query: 'test safety cap' },
      { toolCallId: 'tc-2', messages: [], context: {} },
    )) as {
      results: Array<{ content: string }>;
    };

    const totalChars = output.results.reduce((acc, r) => acc + r.content.length, 0);
    expect(totalChars).toBeLessThanOrEqual(8000);
    expect(output.results[0].content.length).toBe(5000);
    expect(output.results[1].content.length).toBe(3000);
  });

  it('handles missing projectId gracefully', async () => {
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
    expect(mockSearchMaterialChunks).not.toHaveBeenCalled();
  });

  it('handles search failures and emits error status', async () => {
    const mockDataStream: DataStreamWriter = { write: vi.fn() };
    mockSearchMaterialChunks.mockRejectedValueOnce(new Error('Vector search failed'));

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
