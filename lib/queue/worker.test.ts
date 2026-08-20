import { beforeEach, describe, expect, it, vi } from 'vitest';
import { processMaterialIngest } from './worker';

const mockUpdateMaterialStatus = vi.fn();
const mockInsertMaterialChunks = vi.fn();
const mockDownload = vi.fn();
const mockGenerateEmbeddings = vi.fn();
const mockRasterizeDocument = vi.fn();
const mockExtractMarkdownFromPages = vi.fn();

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

vi.mock('@/lib/materials/rasterizer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/materials/rasterizer')>();
  return {
    ...actual,
    rasterizeDocument: (...args: unknown[]) => mockRasterizeDocument(...args),
  };
});

vi.mock('@/lib/materials/vision', () => ({
  extractMarkdownFromPages: (...args: unknown[]) => mockExtractMarkdownFromPages(...args),
}));

describe('Material Ingestion Worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Plain Text Ingestion', () => {
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
      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-1',
          status: 'processing',
        }),
      );

      // Verify downloaded from storage
      expect(mockDownload).toHaveBeenCalledWith('proj-1/notes.md');

      // Verify embeddings generated
      expect(mockGenerateEmbeddings).toHaveBeenCalled();

      // Verify chunks inserted into DB with pageNumber
      expect(mockInsertMaterialChunks).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            materialId: 'mat-1',
            projectId: 'proj-1',
            userId: 'user-1',
            chunkIndex: 0,
            metadata: expect.objectContaining({
              pageNumber: 1,
            }),
          }),
        ]),
      );

      // Verify status updated to ready with metadata
      expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'mat-1',
          status: 'ready',
          metadata: expect.objectContaining({
            pageCount: 1,
            chunkCount: expect.any(Number),
            progress: expect.objectContaining({
              stage: 'completed',
              stagePercent: 100,
            }),
          }),
        }),
      );

      expect(result.chunkCount).toBeGreaterThanOrEqual(1);
      expect(result.tokenCount).toBeGreaterThan(0);
    });

    it('handles empty text material gracefully and updates status to ready', async () => {
      mockDownload.mockResolvedValueOnce(Buffer.from('', 'utf-8'));
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-2', status: 'ready' });

      const result = await processMaterialIngest({
        materialId: 'mat-2',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/empty.txt',
        fileType: 'text/plain',
      });

      expect(result).toEqual({ chunkCount: 0, tokenCount: 0, pageCount: 1 });
      expect(mockInsertMaterialChunks).not.toHaveBeenCalled();
      expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'mat-2',
          status: 'ready',
          metadata: expect.objectContaining({
            chunkCount: 0,
            tokenCount: 0,
            pageCount: 1,
          }),
        }),
      );
    });
  });

  describe('Multimodal PDF Ingestion', () => {
    it('rasterizes PDF, runs vision extraction, creates page-attributed chunks, and tracks progress', async () => {
      const fakePdfBuffer = Buffer.from('%PDF-fake-content');
      mockDownload.mockResolvedValueOnce(fakePdfBuffer);

      mockRasterizeDocument.mockResolvedValueOnce([
        {
          pageNumber: 1,
          imageBuffer: Buffer.from('png-page-1'),
          width: 1024,
          height: 768,
          mimeType: 'image/png',
        },
        {
          pageNumber: 2,
          imageBuffer: Buffer.from('png-page-2'),
          width: 1024,
          height: 768,
          mimeType: 'image/png',
        },
      ]);

      mockExtractMarkdownFromPages.mockImplementationOnce(async (_pages, { onProgress }) => {
        if (onProgress) {
          await onProgress(1, 2, 1);
          await onProgress(2, 2, 2);
        }
        return [
          {
            pageNumber: 1,
            markdown: '# Slide 1: Introduction\n\n- Overview of the system',
          },
          {
            pageNumber: 2,
            markdown: '# Slide 2: Architecture\n\n```mermaid\nflowchart TD\n  A --> B\n```',
          },
        ];
      });

      mockGenerateEmbeddings.mockResolvedValueOnce([
        new Array(768).fill(0.05),
        new Array(768).fill(0.08),
      ]);
      mockInsertMaterialChunks.mockResolvedValueOnce([]);
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-pdf', status: 'ready' });

      const result = await processMaterialIngest({
        materialId: 'mat-pdf',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/lecture.pdf',
        fileType: 'application/pdf',
      });

      // Verify rasterization was invoked
      expect(mockRasterizeDocument).toHaveBeenCalledWith(
        fakePdfBuffer,
        'application/pdf',
        'proj-1/lecture.pdf',
      );

      // Verify vision extraction was called with progress callback
      expect(mockExtractMarkdownFromPages).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          onProgress: expect.any(Function),
        }),
      );

      // Verify chunks were inserted with exact pageNumber attributes
      expect(mockInsertMaterialChunks).toHaveBeenCalledWith([
        expect.objectContaining({
          materialId: 'mat-pdf',
          chunkIndex: 0,
          content: expect.stringContaining('Slide 1: Introduction'),
          metadata: expect.objectContaining({
            pageNumber: 1,
            heading: 'Slide 1: Introduction',
          }),
        }),
        expect.objectContaining({
          materialId: 'mat-pdf',
          chunkIndex: 1,
          content: expect.stringContaining('Slide 2: Architecture'),
          metadata: expect.objectContaining({
            pageNumber: 2,
            heading: 'Slide 2: Architecture',
          }),
        }),
      ]);

      // Verify final status is ready with pageCount 2 and chunkCount 2
      expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'mat-pdf',
          status: 'ready',
          metadata: expect.objectContaining({
            pageCount: 2,
            chunkCount: 2,
            progress: expect.objectContaining({
              stage: 'completed',
              stagePercent: 100,
              totalPages: 2,
              currentPage: 2,
            }),
          }),
        }),
      );

      expect(result.pageCount).toBe(2);
      expect(result.chunkCount).toBe(2);
    });

    it('handles image ingestion (PNG / JPG) with single page attribution', async () => {
      const fakeImgBuffer = Buffer.from('fake-image-bytes');
      mockDownload.mockResolvedValueOnce(fakeImgBuffer);

      mockRasterizeDocument.mockResolvedValueOnce([
        {
          pageNumber: 1,
          imageBuffer: Buffer.from('normalized-png'),
          width: 800,
          height: 600,
          mimeType: 'image/png',
        },
      ]);

      mockExtractMarkdownFromPages.mockResolvedValueOnce([
        {
          pageNumber: 1,
          markdown: '# Mindmap\n\n> **Handwritten Note:** Key exam topic',
        },
      ]);

      mockGenerateEmbeddings.mockResolvedValueOnce([new Array(768).fill(0.01)]);
      mockInsertMaterialChunks.mockResolvedValueOnce([]);
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-img', status: 'ready' });

      const result = await processMaterialIngest({
        materialId: 'mat-img',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/mindmap.png',
        fileType: 'image/png',
      });

      expect(result.pageCount).toBe(1);
      expect(result.chunkCount).toBe(1);
      expect(mockInsertMaterialChunks).toHaveBeenCalledWith([
        expect.objectContaining({
          metadata: expect.objectContaining({
            pageNumber: 1,
            heading: 'Mindmap',
          }),
        }),
      ]);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('captures download failure and records error metadata with failed stage', async () => {
      mockDownload.mockRejectedValueOnce(new Error('Storage download corrupted'));
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-err-1', status: 'failed' });

      await expect(
        processMaterialIngest({
          materialId: 'mat-err-1',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'proj-1/bad.md',
          fileType: 'text/markdown',
        }),
      ).rejects.toThrow('Storage download corrupted');

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-err-1',
          status: 'failed',
          errorMessage: 'Storage download corrupted',
          metadata: expect.objectContaining({
            error: expect.objectContaining({
              message: 'Storage download corrupted',
              stage: 'downloading',
              failedAt: expect.any(String),
            }),
            progress: {
              stage: 'failed',
              stagePercent: 0,
            },
          }),
        }),
      );
    });

    it('captures rasterization failure and records error in metadata', async () => {
      mockDownload.mockResolvedValueOnce(Buffer.from('corrupted-pdf'));
      mockRasterizeDocument.mockRejectedValueOnce(new Error('Invalid PDF header structure'));
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-err-2', status: 'failed' });

      await expect(
        processMaterialIngest({
          materialId: 'mat-err-2',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'proj-1/bad.pdf',
          fileType: 'application/pdf',
        }),
      ).rejects.toThrow('Invalid PDF header structure');

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-err-2',
          status: 'failed',
          errorMessage: 'Invalid PDF header structure',
          metadata: expect.objectContaining({
            error: expect.objectContaining({
              message: 'Invalid PDF header structure',
              stage: 'rasterizing',
            }),
          }),
        }),
      );
    });

    it('captures vision extraction LLM failure and records error in metadata', async () => {
      mockDownload.mockResolvedValueOnce(Buffer.from('valid-pdf'));
      mockRasterizeDocument.mockResolvedValueOnce([
        {
          pageNumber: 1,
          imageBuffer: Buffer.from('img'),
          width: 800,
          height: 600,
          mimeType: 'image/png',
        },
      ]);
      mockExtractMarkdownFromPages.mockRejectedValueOnce(
        new Error('Gemini Flash API quota exceeded'),
      );
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-err-3', status: 'failed' });

      await expect(
        processMaterialIngest({
          materialId: 'mat-err-3',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'proj-1/quota.pdf',
          fileType: 'application/pdf',
        }),
      ).rejects.toThrow('Gemini Flash API quota exceeded');

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-err-3',
          status: 'failed',
          errorMessage: 'Gemini Flash API quota exceeded',
          metadata: expect.objectContaining({
            error: expect.objectContaining({
              message: 'Gemini Flash API quota exceeded',
              stage: 'extracting_vision',
            }),
          }),
        }),
      );
    });
  });
});
