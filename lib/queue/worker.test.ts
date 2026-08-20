import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processMaterialIngest } from './worker';

const mockUpdateMaterialStatus = vi.fn();
const mockInsertMaterialChunks = vi.fn();
const mockDownload = vi.fn();
const mockGenerateEmbeddings = vi.fn();

vi.mock('@/lib/db/queries/material', () => ({
  updateMaterialStatus: (...args: unknown[]) => mockUpdateMaterialStatus(...args),
  insertMaterialChunks: (...args: unknown[]) => mockInsertMaterialChunks(...args),
}));

vi.mock('@/lib/storage', () => ({
  getStorageDriver: () => ({
    download: (...args: unknown[]) => mockDownload(...args),
  }),
}));

vi.mock('@/lib/ai/embedding', () => ({
  generateEmbeddings: (...args: unknown[]) => mockGenerateEmbeddings(...args),
}));

describe('Material Ingestion Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes text material, generates embeddings and persists chunks', async () => {
    const markdownContent = `# Chapter 1
This is the first paragraph with some details about vectors.

# Chapter 2
This is the second chapter discussing linear transformations.`;

    mockDownload.mockResolvedValueOnce(Buffer.from(markdownContent, 'utf-8'));
    mockGenerateEmbeddings.mockResolvedValueOnce([
      new Array(768).fill(0.01),
      new Array(768).fill(0.02),
    ]);
    mockInsertMaterialChunks.mockResolvedValueOnce([]);
    mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-1', status: 'ready' });

    const result = await processMaterialIngest({
      materialId: 'mat-1',
      projectId: 'proj-1',
      userId: 'user-1',
      storagePath: 'proj-1/notes.md',
      fileType: 'text/markdown',
    });

    // Verify status updated to processing first
    expect(mockUpdateMaterialStatus).toHaveBeenNthCalledWith(1, {
      id: 'mat-1',
      status: 'processing',
    });

    // Verify downloaded from storage
    expect(mockDownload).toHaveBeenCalledWith('proj-1/notes.md');

    // Verify embeddings generated
    expect(mockGenerateEmbeddings).toHaveBeenCalled();

    // Verify chunks inserted into DB
    expect(mockInsertMaterialChunks).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          materialId: 'mat-1',
          projectId: 'proj-1',
          userId: 'user-1',
          chunkIndex: 0,
        }),
      ]),
    );

    // Verify status updated to ready
    expect(mockUpdateMaterialStatus).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        id: 'mat-1',
        status: 'ready',
      }),
    );

    expect(result.chunkCount).toBeGreaterThanOrEqual(1);
    expect(result.tokenCount).toBeGreaterThan(0);
  });

  it('handles empty material gracefully and updates status to ready', async () => {
    mockDownload.mockResolvedValueOnce(Buffer.from('', 'utf-8'));
    mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-2', status: 'ready' });

    const result = await processMaterialIngest({
      materialId: 'mat-2',
      projectId: 'proj-1',
      userId: 'user-1',
      storagePath: 'proj-1/empty.txt',
      fileType: 'text/plain',
    });

    expect(result).toEqual({ chunkCount: 0, tokenCount: 0 });
    expect(mockInsertMaterialChunks).not.toHaveBeenCalled();
    expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith({
      id: 'mat-2',
      status: 'ready',
      metadata: { chunkCount: 0, tokenCount: 0 },
    });
  });

  it('handles processing failure and marks material status as failed', async () => {
    mockDownload.mockRejectedValueOnce(new Error('Storage download corrupted'));
    mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-3', status: 'failed' });

    await expect(
      processMaterialIngest({
        materialId: 'mat-3',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/bad.md',
        fileType: 'text/markdown',
      }),
    ).rejects.toThrow('Storage download corrupted');

    expect(mockUpdateMaterialStatus).toHaveBeenCalledWith({
      id: 'mat-3',
      status: 'failed',
      errorMessage: 'Storage download corrupted',
    });
  });
});
