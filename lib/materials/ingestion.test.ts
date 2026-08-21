import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateEmbeddings } from '@/lib/ai/embedding';
import type { StorageDriver } from '@/lib/storage';
import {
  chunkMultimodalPages,
  extractMarkdownFromPages,
  type IngestMaterialInput,
  type IngestMaterialResult,
  ingestMaterial,
  isMultimodal,
  type MaterialProgress,
  rasterizeDocument,
} from './index';

// Mocks for DB and default storage
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

vi.mock('@/lib/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/storage')>();
  return {
    ...actual,
    getStorageDriver: () => ({
      download: (...args: unknown[]) => mockDownload(...args),
      upload: vi.fn(),
      delete: vi.fn(),
    }),
  };
});

vi.mock('@/lib/ai/embedding', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/ai/embedding')>();
  return {
    ...actual,
    generateEmbeddings: (...args: unknown[]) => {
      if (mockGenerateEmbeddings.getMockImplementation()) {
        return mockGenerateEmbeddings(...args);
      }
      return actual.generateEmbeddings(...(args as [string[]]));
    },
  };
});

vi.mock('@/lib/materials/rasterizer', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/materials/rasterizer')>();
  return {
    ...actual,
    rasterizeDocument: (...args: unknown[]) => {
      if (mockRasterizeDocument.getMockImplementation()) {
        return mockRasterizeDocument(...args);
      }
      return actual.rasterizeDocument(...(args as [Buffer, string, string?]));
    },
  };
});

vi.mock('@/lib/materials/vision', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/materials/vision')>();
  return {
    ...actual,
    extractMarkdownFromPages: (...args: unknown[]) => {
      if (mockExtractMarkdownFromPages.getMockImplementation()) {
        return mockExtractMarkdownFromPages(...args);
      }
      return actual.extractMarkdownFromPages(
        ...(args as Parameters<typeof actual.extractMarkdownFromPages>),
      );
    },
  };
});

function createMinimalPdfBuffer(pageCount = 2): Buffer {
  let pdf =
    '%PDF-1.4\n1 0 obj <</Type /Catalog /Pages 2 0 R>> endobj\n2 0 obj <</Type /Pages /Kids [';
  const pageObjNums: number[] = [];
  let currentObj = 3;

  for (let i = 0; i < pageCount; i++) {
    pageObjNums.push(currentObj);
    currentObj += 2;
  }

  pdf += `${pageObjNums.map((n) => `${n} 0 R`).join(' ')}] /Count ${pageCount}>> endobj\n`;

  for (let i = 0; i < pageCount; i++) {
    const pageNum = pageObjNums[i];
    const contentsNum = pageNum + 1;
    pdf += `${pageNum} 0 obj <</Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources <<>> /Contents ${contentsNum} 0 R>> endobj\n`;
    pdf += `${contentsNum} 0 obj <</Length 24>> stream\n0 0 200 200 re f\nendstream\nendobj\n`;
  }

  pdf += 'xref\n0 1\n0000000000 65535 f \ntrailer <</Size 10 /Root 1 0 R>>\nstartxref\n100\n%%EOF';
  return Buffer.from(pdf);
}

async function createTestImageBuffer(width = 300, height = 200): Promise<Buffer> {
  return await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 64, g: 128, b: 192, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe('ingestMaterial Core Domain Function', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateMaterialStatus.mockReset();
    mockInsertMaterialChunks.mockReset();
    mockDownload.mockReset();
    mockGenerateEmbeddings.mockReset();
    mockRasterizeDocument.mockReset();
    mockExtractMarkdownFromPages.mockReset();
  });

  describe('Plain Text and Markdown Ingestion Lifecycle', () => {
    it('processes Markdown material, transitions through intermediate stages, generates embeddings, and persists chunks', async () => {
      const markdownContent = `# Chapter 1: Introduction to Vectors
Vectors are geometric objects with magnitude and direction.

# Chapter 2: Vector Operations
Vector addition follows the parallelogram law.`;

      mockDownload.mockResolvedValueOnce(Buffer.from(markdownContent, 'utf-8'));
      mockGenerateEmbeddings.mockResolvedValueOnce([
        new Array(768).fill(0.01),
        new Array(768).fill(0.02),
      ]);
      mockInsertMaterialChunks.mockResolvedValueOnce([]);
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-md-1', status: 'ready' });

      const progressEvents: MaterialProgress[] = [];
      const onProgress = vi.fn((prog: MaterialProgress) => {
        progressEvents.push(prog);
      });

      const input: IngestMaterialInput = {
        materialId: 'mat-md-1',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/notes.md',
        fileType: 'text/markdown',
      };

      const result: IngestMaterialResult = await ingestMaterial(input, { onProgress });

      // Verify download called with storage path
      expect(mockDownload).toHaveBeenCalledWith('proj-1/notes.md');

      // Verify embedding generation called
      expect(mockGenerateEmbeddings).toHaveBeenCalledWith(expect.any(Array));

      // Verify chunks persisted to DB with default pageNumber: 1
      expect(mockInsertMaterialChunks).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            materialId: 'mat-md-1',
            projectId: 'proj-1',
            userId: 'user-1',
            chunkIndex: 0,
            tokenCount: expect.any(Number),
            embedding: expect.any(Array),
            metadata: expect.objectContaining({
              pageNumber: 1,
            }),
          }),
        ]),
      );

      // Verify progress callback sequence
      expect(onProgress).toHaveBeenCalled();
      const stages = progressEvents.map((e) => e.stage);
      expect(stages).toContain('downloading');
      expect(stages).toContain('chunking');
      expect(stages).toContain('embedding');
      expect(stages).toContain('persisting');
      expect(stages).toContain('completed');

      // Verify status transitions in DB
      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-md-1',
          status: 'processing',
          metadata: expect.objectContaining({
            progress: expect.objectContaining({
              stage: 'downloading',
            }),
          }),
        }),
      );

      expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'mat-md-1',
          status: 'ready',
          metadata: expect.objectContaining({
            pageCount: 1,
            chunkCount: expect.any(Number),
            tokenCount: expect.any(Number),
            progress: expect.objectContaining({
              stage: 'completed',
              stagePercent: 100,
            }),
          }),
        }),
      );

      // Verify result shape
      expect(result.chunkCount).toBeGreaterThanOrEqual(1);
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(result.pageCount).toBe(1);
    });

    it('handles empty text material gracefully without chunking or embedding', async () => {
      mockDownload.mockResolvedValueOnce(Buffer.from('   \n\n  ', 'utf-8'));
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-empty', status: 'ready' });

      const progressEvents: MaterialProgress[] = [];
      const onProgress = (p: MaterialProgress) => {
        progressEvents.push(p);
      };

      const result = await ingestMaterial(
        {
          materialId: 'mat-empty',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'proj-1/empty.txt',
          fileType: 'text/plain',
        },
        { onProgress },
      );

      expect(result).toEqual({ chunkCount: 0, tokenCount: 0, pageCount: 1 });
      expect(mockGenerateEmbeddings).not.toHaveBeenCalled();
      expect(mockInsertMaterialChunks).not.toHaveBeenCalled();

      expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'mat-empty',
          status: 'ready',
          metadata: expect.objectContaining({
            chunkCount: 0,
            tokenCount: 0,
            pageCount: 1,
            progress: expect.objectContaining({
              stage: 'completed',
              stagePercent: 100,
            }),
          }),
        }),
      );

      expect(progressEvents[progressEvents.length - 1].stage).toBe('completed');
    });

    it('uses injected custom storageDriver when provided in options', async () => {
      const customStorageDriver: StorageDriver = {
        download: vi.fn().mockResolvedValue(Buffer.from('Custom driver content', 'utf-8')),
        upload: vi.fn(),
        delete: vi.fn(),
      };

      mockGenerateEmbeddings.mockResolvedValueOnce([new Array(768).fill(0.03)]);
      mockInsertMaterialChunks.mockResolvedValueOnce([]);
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-custom-storage', status: 'ready' });

      const result = await ingestMaterial(
        {
          materialId: 'mat-custom-storage',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'custom/path.txt',
          fileType: 'text/plain',
        },
        { storageDriver: customStorageDriver },
      );

      expect(customStorageDriver.download).toHaveBeenCalledWith('custom/path.txt');
      expect(mockDownload).not.toHaveBeenCalled();
      expect(result.chunkCount).toBe(1);
    });
  });

  describe('Failure Modes and Error Recovery', () => {
    it('records error with stage "downloading" when storage download fails, then re-throws', async () => {
      mockDownload.mockRejectedValueOnce(new Error('Network timeout fetching object'));
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-err-dl', status: 'failed' });

      const onProgress = vi.fn();

      await expect(
        ingestMaterial(
          {
            materialId: 'mat-err-dl',
            projectId: 'proj-1',
            userId: 'user-1',
            storagePath: 'proj-1/missing.txt',
            fileType: 'text/plain',
          },
          { onProgress },
        ),
      ).rejects.toThrow('Network timeout fetching object');

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-err-dl',
          status: 'failed',
          errorMessage: 'Network timeout fetching object',
          metadata: expect.objectContaining({
            error: expect.objectContaining({
              message: 'Network timeout fetching object',
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

      expect(onProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          stage: 'failed',
          stagePercent: 0,
        }),
      );
    });

    it('records error with stage "embedding" when embedding generation fails, then re-throws', async () => {
      mockDownload.mockResolvedValueOnce(Buffer.from('Some study content to embed', 'utf-8'));
      mockGenerateEmbeddings.mockRejectedValueOnce(new Error('Embedding API rate limit reached'));
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-err-emb', status: 'failed' });

      await expect(
        ingestMaterial({
          materialId: 'mat-err-emb',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'proj-1/notes.md',
          fileType: 'text/markdown',
        }),
      ).rejects.toThrow('Embedding API rate limit reached');

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-err-emb',
          status: 'failed',
          errorMessage: 'Embedding API rate limit reached',
          metadata: expect.objectContaining({
            error: expect.objectContaining({
              message: 'Embedding API rate limit reached',
              stage: 'embedding',
            }),
          }),
        }),
      );
    });

    it('records error with stage "persisting" when database chunk insertion fails, then re-throws', async () => {
      mockDownload.mockResolvedValueOnce(Buffer.from('Some study content to persist', 'utf-8'));
      mockGenerateEmbeddings.mockResolvedValueOnce([new Array(768).fill(0.01)]);
      mockInsertMaterialChunks.mockRejectedValueOnce(new Error('Database connection reset'));
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-err-db', status: 'failed' });

      await expect(
        ingestMaterial({
          materialId: 'mat-err-db',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'proj-1/notes.md',
          fileType: 'text/markdown',
        }),
      ).rejects.toThrow('Database connection reset');

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-err-db',
          status: 'failed',
          errorMessage: 'Database connection reset',
          metadata: expect.objectContaining({
            error: expect.objectContaining({
              message: 'Database connection reset',
              stage: 'persisting',
            }),
          }),
        }),
      );
    });
  });

  describe('Multimodal PDF and Image Handling', () => {
    it('rasterizes PDF, runs vision extraction, generates embeddings, and persists page-attributed chunks with granular progress tracking', async () => {
      const fakePdfBuffer = Buffer.from('%PDF-1.4-sample');
      mockDownload.mockResolvedValueOnce(fakePdfBuffer);

      mockRasterizeDocument.mockImplementationOnce(async (_buf, _type, _path, options) => {
        if (options?.onProgress) {
          await options.onProgress(1, 2, 1);
          await options.onProgress(2, 2, 2);
        }
        return [
          {
            pageNumber: 1,
            imageBuffer: Buffer.from('page-1-bytes'),
            width: 1024,
            height: 768,
            mimeType: 'image/png',
          },
          {
            pageNumber: 2,
            imageBuffer: Buffer.from('page-2-bytes'),
            width: 1024,
            height: 768,
            mimeType: 'image/png',
          },
        ];
      });

      mockExtractMarkdownFromPages.mockImplementationOnce(async (_pages, { onProgress }) => {
        if (onProgress) {
          await onProgress(1, 2, 1);
          await onProgress(2, 2, 2);
        }
        return [
          { pageNumber: 1, markdown: '# Page 1: Key Terms' },
          { pageNumber: 2, markdown: '# Page 2: Summary Diagram' },
        ];
      });

      mockGenerateEmbeddings.mockResolvedValueOnce([
        new Array(768).fill(0.01),
        new Array(768).fill(0.02),
      ]);
      mockInsertMaterialChunks.mockResolvedValueOnce([]);
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-pdf-1', status: 'ready' });

      const progressEvents: MaterialProgress[] = [];
      const onProgress = vi.fn((p: MaterialProgress) => {
        progressEvents.push({ ...p });
      });

      const result = await ingestMaterial(
        {
          materialId: 'mat-pdf-1',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'proj-1/slides.pdf',
          fileType: 'application/pdf',
        },
        { onProgress, concurrency: 2, pageDelayMs: 50 },
      );

      expect(mockRasterizeDocument).toHaveBeenCalledWith(
        fakePdfBuffer,
        'application/pdf',
        'proj-1/slides.pdf',
        expect.objectContaining({
          onProgress: expect.any(Function),
        }),
      );

      expect(mockExtractMarkdownFromPages).toHaveBeenCalledWith(
        expect.any(Array),
        expect.objectContaining({
          concurrency: 2,
          pageDelayMs: 50,
          onProgress: expect.any(Function),
        }),
      );

      expect(mockInsertMaterialChunks).toHaveBeenCalledWith([
        expect.objectContaining({
          materialId: 'mat-pdf-1',
          chunkIndex: 0,
          metadata: expect.objectContaining({
            pageNumber: 1,
            heading: 'Page 1: Key Terms',
          }),
        }),
        expect.objectContaining({
          materialId: 'mat-pdf-1',
          chunkIndex: 1,
          metadata: expect.objectContaining({
            pageNumber: 2,
            heading: 'Page 2: Summary Diagram',
          }),
        }),
      ]);

      expect(result.pageCount).toBe(2);
      expect(result.chunkCount).toBe(2);
      expect(result.tokenCount).toBeGreaterThan(0);

      // Verify all granular progress events across the lifecycle
      const stages = progressEvents.map((e) => e.stage);
      expect(stages).toContain('downloading');
      expect(stages).toContain('rasterizing');
      expect(stages).toContain('extracting_vision');
      expect(stages).toContain('chunking');
      expect(stages).toContain('embedding');
      expect(stages).toContain('persisting');
      expect(stages).toContain('completed');

      // Verify rasterizing progress contains granular page info
      const rasterProgress = progressEvents.filter((e) => e.stage === 'rasterizing');
      expect(rasterProgress.length).toBeGreaterThanOrEqual(2);
      expect(rasterProgress).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stage: 'rasterizing', stagePercent: 15 }),
          expect.objectContaining({
            stage: 'rasterizing',
            stagePercent: 20,
            totalPages: 2,
            currentPage: 1,
            completedPages: 1,
          }),
          expect.objectContaining({
            stage: 'rasterizing',
            stagePercent: 25,
            totalPages: 2,
            currentPage: 2,
            completedPages: 2,
          }),
        ]),
      );

      // Verify vision progress contains granular page info
      const visionProgress = progressEvents.filter((e) => e.stage === 'extracting_vision');
      expect(visionProgress.length).toBeGreaterThanOrEqual(2);
      expect(visionProgress).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ stage: 'extracting_vision', stagePercent: 25 }),
          expect.objectContaining({
            stage: 'extracting_vision',
            totalPages: 2,
            currentPage: 1,
            completedPages: 1,
          }),
          expect.objectContaining({
            stage: 'extracting_vision',
            totalPages: 2,
            currentPage: 2,
            completedPages: 2,
          }),
        ]),
      );

      // Verify DB updates include progress metadata
      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-pdf-1',
          status: 'processing',
          metadata: expect.objectContaining({
            progress: expect.objectContaining({
              stage: 'rasterizing',
            }),
          }),
        }),
      );

      expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'mat-pdf-1',
          status: 'ready',
          metadata: expect.objectContaining({
            pageCount: 2,
            chunkCount: 2,
            progress: expect.objectContaining({
              stage: 'completed',
              stagePercent: 100,
              totalPages: 2,
              completedPages: 2,
            }),
          }),
        }),
      );
    });

    it('processes image documents (.png, .jpg) through multimodal pipeline', async () => {
      const fakeImageBuffer = Buffer.from('fake-png-bytes');
      mockDownload.mockResolvedValueOnce(fakeImageBuffer);

      mockRasterizeDocument.mockImplementationOnce(async (_buf, _type, _path, options) => {
        if (options?.onProgress) {
          await options.onProgress(1, 1, 1);
        }
        return [
          {
            pageNumber: 1,
            imageBuffer: Buffer.from('normalized-img'),
            width: 800,
            height: 600,
            mimeType: 'image/png',
          },
        ];
      });

      mockExtractMarkdownFromPages.mockImplementationOnce(async (_pages, { onProgress }) => {
        if (onProgress) {
          await onProgress(1, 1, 1);
        }
        return [
          {
            pageNumber: 1,
            markdown: '# Architecture Diagram\n\n```mermaid\ngraph LR\n  A --> B\n```',
          },
        ];
      });

      mockGenerateEmbeddings.mockResolvedValueOnce([new Array(768).fill(0.05)]);
      mockInsertMaterialChunks.mockResolvedValueOnce([]);
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-img-1', status: 'ready' });

      const progressEvents: MaterialProgress[] = [];
      const onProgress = (p: MaterialProgress) => {
        progressEvents.push({ ...p });
      };

      const result = await ingestMaterial(
        {
          materialId: 'mat-img-1',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'proj-1/diagram.png',
          fileType: 'image/png',
        },
        { onProgress },
      );

      expect(mockRasterizeDocument).toHaveBeenCalledWith(
        fakeImageBuffer,
        'image/png',
        'proj-1/diagram.png',
        expect.any(Object),
      );

      expect(result.pageCount).toBe(1);
      expect(result.chunkCount).toBe(1);
      expect(mockInsertMaterialChunks).toHaveBeenCalledWith([
        expect.objectContaining({
          materialId: 'mat-img-1',
          chunkIndex: 0,
          metadata: expect.objectContaining({
            pageNumber: 1,
            heading: 'Architecture Diagram',
          }),
        }),
      ]);
      expect(progressEvents[progressEvents.length - 1].stage).toBe('completed');
    });

    it('handles empty multimodal documents with zero rasterized pages gracefully', async () => {
      mockDownload.mockResolvedValueOnce(Buffer.from('empty-doc'));
      mockRasterizeDocument.mockResolvedValueOnce([]);
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-empty-pdf', status: 'ready' });

      const result = await ingestMaterial({
        materialId: 'mat-empty-pdf',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/empty.pdf',
        fileType: 'application/pdf',
      });

      expect(result).toEqual({ chunkCount: 0, tokenCount: 0, pageCount: 0 });
      expect(mockExtractMarkdownFromPages).not.toHaveBeenCalled();
      expect(mockGenerateEmbeddings).not.toHaveBeenCalled();
      expect(mockInsertMaterialChunks).not.toHaveBeenCalled();
      expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'mat-empty-pdf',
          status: 'ready',
          metadata: expect.objectContaining({
            pageCount: 0,
            chunkCount: 0,
            tokenCount: 0,
          }),
        }),
      );
    });

    it('handles empty vision extraction results without crashing', async () => {
      mockDownload.mockResolvedValueOnce(Buffer.from('blank-pages-doc'));
      mockRasterizeDocument.mockResolvedValueOnce([
        {
          pageNumber: 1,
          imageBuffer: Buffer.from('blank-img'),
          width: 800,
          height: 600,
          mimeType: 'image/png',
        },
      ]);
      mockExtractMarkdownFromPages.mockResolvedValueOnce([
        {
          pageNumber: 1,
          markdown: '   ',
        },
      ]);
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-blank-pdf', status: 'ready' });

      const result = await ingestMaterial({
        materialId: 'mat-blank-pdf',
        projectId: 'proj-1',
        userId: 'user-1',
        storagePath: 'proj-1/blank.pdf',
        fileType: 'application/pdf',
      });

      expect(result).toEqual({ chunkCount: 0, tokenCount: 0, pageCount: 1 });
      expect(mockGenerateEmbeddings).not.toHaveBeenCalled();
      expect(mockInsertMaterialChunks).not.toHaveBeenCalled();
      expect(mockUpdateMaterialStatus).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: 'mat-blank-pdf',
          status: 'ready',
          metadata: expect.objectContaining({
            pageCount: 1,
            chunkCount: 0,
          }),
        }),
      );
    });

    it('records error with stage "rasterizing" when PDF rasterization fails', async () => {
      mockDownload.mockResolvedValueOnce(Buffer.from('corrupted-pdf-stream'));
      mockRasterizeDocument.mockRejectedValueOnce(new Error('Invalid PDF format'));
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-err-rast', status: 'failed' });

      await expect(
        ingestMaterial({
          materialId: 'mat-err-rast',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'proj-1/corrupt.pdf',
          fileType: 'application/pdf',
        }),
      ).rejects.toThrow('Invalid PDF format');

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-err-rast',
          status: 'failed',
          errorMessage: 'Invalid PDF format',
          metadata: expect.objectContaining({
            error: expect.objectContaining({
              message: 'Invalid PDF format',
              stage: 'rasterizing',
            }),
          }),
        }),
      );
    });

    it('records error with stage "rasterizing" when image rasterization fails', async () => {
      mockDownload.mockResolvedValueOnce(Buffer.from('corrupted-image-stream'));
      mockRasterizeDocument.mockRejectedValueOnce(new Error('Failed to rasterize image'));
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-err-img-rast', status: 'failed' });

      await expect(
        ingestMaterial({
          materialId: 'mat-err-img-rast',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'proj-1/corrupt.png',
          fileType: 'image/png',
        }),
      ).rejects.toThrow('Failed to rasterize image');

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-err-img-rast',
          status: 'failed',
          errorMessage: 'Failed to rasterize image',
          metadata: expect.objectContaining({
            error: expect.objectContaining({
              message: 'Failed to rasterize image',
              stage: 'rasterizing',
            }),
          }),
        }),
      );
    });

    it('records error with stage "extracting_vision" when vision model fails', async () => {
      mockDownload.mockResolvedValueOnce(Buffer.from('valid-pdf-stream'));
      mockRasterizeDocument.mockResolvedValueOnce([
        {
          pageNumber: 1,
          imageBuffer: Buffer.from('img-bytes'),
          width: 800,
          height: 600,
          mimeType: 'image/png',
        },
      ]);
      mockExtractMarkdownFromPages.mockRejectedValueOnce(
        new Error('Vision extraction model error'),
      );
      mockUpdateMaterialStatus.mockResolvedValue({ id: 'mat-err-vis', status: 'failed' });

      await expect(
        ingestMaterial({
          materialId: 'mat-err-vis',
          projectId: 'proj-1',
          userId: 'user-1',
          storagePath: 'proj-1/vis.pdf',
          fileType: 'application/pdf',
        }),
      ).rejects.toThrow('Vision extraction model error');

      expect(mockUpdateMaterialStatus).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'mat-err-vis',
          status: 'failed',
          errorMessage: 'Vision extraction model error',
          metadata: expect.objectContaining({
            error: expect.objectContaining({
              message: 'Vision extraction model error',
              stage: 'extracting_vision',
            }),
          }),
        }),
      );
    });
  });
});

describe('Multimodal Ingestion Pipeline Integration', () => {
  it('executes full rasterization -> vision extraction -> page-attributed chunking -> embedding pipeline for multi-page PDF', async () => {
    // 1. PDF Buffer
    const pdfBuffer = createMinimalPdfBuffer(2);
    expect(isMultimodal('application/pdf', 'sample.pdf')).toBe(true);

    // 2. Rasterize PDF into pages
    const pages = await rasterizeDocument(pdfBuffer, 'application/pdf', 'sample.pdf');
    expect(pages).toHaveLength(2);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[1].pageNumber).toBe(2);
    expect(pages[0].imageBuffer).toBeInstanceOf(Buffer);
    expect(pages[1].imageBuffer).toBeInstanceOf(Buffer);

    // 3. Vision Extraction (Mock Language Model)
    const progressHistory: Array<{ completed: number; total: number; page: number }> = [];
    const mockModel = {
      specificationVersion: 'v2' as const,
      provider: 'mock',
      modelId: 'mock-vision',
      doGenerate: vi.fn().mockImplementation(({ prompt }) => {
        const filePart = prompt[0].content.find((c: { type: string }) => c.type === 'file');
        expect(filePart).toBeDefined();

        return Promise.resolve({
          content: [
            {
              type: 'text',
              text: `# Slide Topic\n\n| Param | Value |\n|---|---|\n| Accuracy | 99% |\n\n\`\`\`mermaid\ngraph TD\n  Start --> End\n\`\`\``,
            },
          ],
          finishReason: { unified: 'stop', raw: 'stop' },
          usage: { inputTokens: { total: 100 }, outputTokens: { total: 40 } },
          warnings: [],
        });
      }),
      doStream: vi.fn(),
    };

    const visionResults = await extractMarkdownFromPages(pages, {
      model: mockModel as never,
      concurrency: 2,
      onProgress: (completed, total, page) => {
        progressHistory.push({ completed, total, page });
      },
    });

    expect(visionResults).toHaveLength(2);
    expect(progressHistory).toHaveLength(2);
    expect(visionResults[0].pageNumber).toBe(1);
    expect(visionResults[0].markdown).toContain('Accuracy');
    expect(visionResults[0].markdown).toContain('```mermaid');
    expect(visionResults[1].pageNumber).toBe(2);

    // 4. Page-attributed Chunking
    const chunks = chunkMultimodalPages(visionResults);
    expect(chunks).toHaveLength(2);

    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].metadata.pageNumber).toBe(1);
    expect(chunks[0].metadata.heading).toBe('Slide Topic');
    expect(chunks[0].content).toContain('Accuracy');

    expect(chunks[1].chunkIndex).toBe(1);
    expect(chunks[1].metadata.pageNumber).toBe(2);
    expect(chunks[1].metadata.heading).toBe('Slide Topic');

    // 5. Generate 768d Vector Embeddings
    const contents = chunks.map((c) => c.content);
    const embeddings = await generateEmbeddings(contents);

    expect(embeddings).toHaveLength(2);
    expect(embeddings[0]).toHaveLength(768);
    expect(embeddings[1]).toHaveLength(768);
  });

  it('executes full pipeline for standalone whiteboard / mindmap image', async () => {
    // 1. Create test image
    const imageBuffer = await createTestImageBuffer(400, 300);
    expect(isMultimodal('image/png', 'mindmap.png')).toBe(true);

    // 2. Rasterize
    const pages = await rasterizeDocument(imageBuffer, 'image/png', 'mindmap.png');
    expect(pages).toHaveLength(1);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[0].width).toBe(400);
    expect(pages[0].height).toBe(300);

    // 3. Vision Extraction
    const mockModel = {
      specificationVersion: 'v2' as const,
      provider: 'mock',
      modelId: 'mock-vision',
      doGenerate: vi.fn().mockResolvedValue({
        content: [
          {
            type: 'text',
            text: '# Handwritten Lecture Notes\n\n> **Handwritten Note:** FSRS memory decay factor R = e^(-t/S)',
          },
        ],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: { inputTokens: { total: 50 }, outputTokens: { total: 25 } },
        warnings: [],
      }),
      doStream: vi.fn(),
    };

    const visionResults = await extractMarkdownFromPages(pages, { model: mockModel as never });
    expect(visionResults).toHaveLength(1);
    expect(visionResults[0].pageNumber).toBe(1);
    expect(visionResults[0].markdown).toContain('FSRS memory decay factor');

    // 4. Chunking
    const chunks = chunkMultimodalPages(visionResults);
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].metadata.pageNumber).toBe(1);
    expect(chunks[0].metadata.heading).toBe('Handwritten Lecture Notes');

    // 5. Dense 768d Embeddings
    const embeddings = await generateEmbeddings([chunks[0].content]);
    expect(embeddings).toHaveLength(1);
    expect(embeddings[0]).toHaveLength(768);
  });

  it('rejects corrupted document during rasterization phase', async () => {
    const corruptedBuffer = Buffer.from('Corrupted file stream data');
    await expect(
      rasterizeDocument(corruptedBuffer, 'application/pdf', 'corrupted.pdf'),
    ).rejects.toThrow();
  });
});
