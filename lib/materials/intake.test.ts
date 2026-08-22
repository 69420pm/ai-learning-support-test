import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatbotError } from '@/lib/errors';
import type { StorageDriver } from '@/lib/storage';
import { LocalStorageDriver, resetStorageDriver } from '@/lib/storage';
import { inferMaterialFileType, intakeMaterial, sanitizeFilename } from './intake';
import { MAX_MATERIAL_FILE_SIZE } from './validation';

// Mock DB queries
const mockCreateMaterial = vi.fn();
vi.mock('@/lib/db/queries/material', () => ({
  createMaterial: (...args: unknown[]) => mockCreateMaterial(...args),
}));

// Mock Queue
const mockSendIngestJob = vi.fn();
vi.mock('@/lib/queue', () => ({
  sendIngestJob: (...args: unknown[]) => mockSendIngestJob(...args),
}));

describe('Material Intake Domain Logic', () => {
  const defaultProjectId = '11111111-1111-1111-1111-111111111111';
  const defaultUserId = '22222222-2222-2222-2222-222222222222';

  let mockUpload: ReturnType<typeof vi.fn>;
  let mockDownload: ReturnType<typeof vi.fn>;
  let mockDelete: ReturnType<typeof vi.fn>;
  let mockGetUrl: ReturnType<typeof vi.fn>;
  let mockStorage: StorageDriver;

  beforeEach(() => {
    vi.clearAllMocks();
    resetStorageDriver();

    mockUpload = vi.fn().mockResolvedValue({ path: 'uploaded-path', size: 123 });
    mockDownload = vi.fn().mockResolvedValue(Buffer.from('content'));
    mockDelete = vi.fn().mockResolvedValue(undefined);
    mockGetUrl = vi.fn().mockResolvedValue('file://uploaded-path');

    mockStorage = {
      upload: mockUpload,
      download: mockDownload,
      delete: mockDelete,
      getUrl: mockGetUrl,
    } as unknown as StorageDriver;

    mockCreateMaterial.mockImplementation(async (params) => ({
      id: 'mat-uuid-1234',
      projectId: params.projectId,
      userId: params.userId,
      title: params.title,
      filename: params.filename,
      fileType: params.fileType,
      fileSize: params.fileSize || 0,
      storagePath: params.storagePath,
      status: 'pending',
      errorMessage: null,
      metadata: params.metadata || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    mockSendIngestJob.mockResolvedValue('job-123');
  });

  describe('sanitizeFilename', () => {
    it('preserves clean standard filenames', () => {
      expect(sanitizeFilename('lecture_notes.pdf')).toBe('lecture_notes.pdf');
      expect(sanitizeFilename('chapter-1.md')).toBe('chapter-1.md');
      expect(sanitizeFilename('diagram.png')).toBe('diagram.png');
    });

    it('sanitizes spaces, special characters, and multiple symbols', () => {
      expect(sanitizeFilename('My Lecture Notes (Draft #1)!.pdf')).toBe(
        'My_Lecture_Notes_Draft_1.pdf',
      );
      expect(sanitizeFilename('symbols & * % @ test.txt')).toBe('symbols_test.txt');
    });

    it('strips directory traversal paths', () => {
      expect(sanitizeFilename('../../etc/passwd.txt')).toBe('passwd.txt');
      expect(sanitizeFilename('..\\..\\windows\\system32\\cmd.pdf')).toBe('cmd.pdf');
    });

    it('falls back gracefully on empty or symbol-only names', () => {
      expect(sanitizeFilename('???!!!')).toBe('material');
      expect(sanitizeFilename('...')).toBe('material');
      expect(sanitizeFilename('')).toBe('material');
      expect(sanitizeFilename('***.pdf')).toBe('material.pdf');
    });
  });

  describe('inferMaterialFileType', () => {
    it('infers MIME types from known extensions', () => {
      expect(inferMaterialFileType('doc.pdf')).toBe('application/pdf');
      expect(inferMaterialFileType('notes.md')).toBe('text/markdown');
      expect(inferMaterialFileType('notes.markdown')).toBe('text/markdown');
      expect(inferMaterialFileType('readme.txt')).toBe('text/plain');
      expect(inferMaterialFileType('photo.png')).toBe('image/png');
      expect(inferMaterialFileType('photo.jpg')).toBe('image/jpeg');
      expect(inferMaterialFileType('photo.jpeg')).toBe('image/jpeg');
      expect(inferMaterialFileType('image.webp')).toBe('image/webp');
      expect(inferMaterialFileType('animation.gif')).toBe('image/gif');
      expect(inferMaterialFileType('scan.tiff')).toBe('image/tiff');
      expect(inferMaterialFileType('modern.avif')).toBe('image/avif');
    });

    it('prioritizes explicit valid provided type over default', () => {
      expect(inferMaterialFileType('file.custom', 'application/pdf')).toBe('application/pdf');
      expect(inferMaterialFileType('file.md', 'text/x-markdown')).toBe('text/x-markdown');
    });

    it('overrides generic application/octet-stream if extension is recognized', () => {
      expect(inferMaterialFileType('notes.md', 'application/octet-stream')).toBe('text/markdown');
      expect(inferMaterialFileType('document.pdf', 'application/octet-stream')).toBe(
        'application/pdf',
      );
    });
  });

  describe('File Validation Constraints', () => {
    it('accepts valid PDF, Markdown, text, and supported image formats', async () => {
      const validFiles = [
        new File(['%PDF-1.4'], 'calculus.pdf', { type: 'application/pdf' }),
        new File(['# Topic'], 'notes.md', { type: 'text/markdown' }),
        new File(['plain text'], 'doc.txt', { type: 'text/plain' }),
        new File(['img-data'], 'diagram.png', { type: 'image/png' }),
        new File(['img-data'], 'photo.jpg', { type: 'image/jpeg' }),
        new File(['img-data'], 'graphic.webp', { type: 'image/webp' }),
      ];

      for (const file of validFiles) {
        const result = await intakeMaterial(
          {
            projectId: defaultProjectId,
            userId: defaultUserId,
            file,
          },
          { storageDriver: mockStorage },
        );

        expect(result.status).toBe('pending');
        expect(result.filename).toBe(file.name);
      }
    });

    it('rejects unsupported file extensions and MIME types with standard domain error', async () => {
      const invalidFiles = [
        new File(['binary'], 'malware.exe', { type: 'application/x-msdownload' }),
        new File(['archive'], 'bundle.zip', { type: 'application/zip' }),
        new File(['script'], 'run.sh', { type: 'application/x-sh' }),
        new File(['video'], 'movie.mp4', { type: 'video/mp4' }),
      ];

      for (const file of invalidFiles) {
        await expect(
          intakeMaterial(
            {
              projectId: defaultProjectId,
              userId: defaultUserId,
              file,
            },
            { storageDriver: mockStorage },
          ),
        ).rejects.toThrow(ChatbotError);
      }

      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockCreateMaterial).not.toHaveBeenCalled();
      expect(mockSendIngestJob).not.toHaveBeenCalled();
    });

    it('rejects files exceeding 25MB without creating storage or database entries', async () => {
      const oversizedFile = new File(['content'], 'giant-book.pdf', {
        type: 'application/pdf',
      });
      Object.defineProperty(oversizedFile, 'size', { value: MAX_MATERIAL_FILE_SIZE + 1 });

      await expect(
        intakeMaterial(
          {
            projectId: defaultProjectId,
            userId: defaultUserId,
            file: oversizedFile,
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockCreateMaterial).not.toHaveBeenCalled();
      expect(mockSendIngestJob).not.toHaveBeenCalled();
    });

    it('rejects missing or empty file payloads', async () => {
      await expect(
        intakeMaterial(
          {
            projectId: defaultProjectId,
            userId: defaultUserId,
            file: null as unknown as File,
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockCreateMaterial).not.toHaveBeenCalled();
    });
  });

  describe('Buffer & Descriptor Payload Support', () => {
    it('accepts raw Buffer payloads with descriptor metadata', async () => {
      const buffer = Buffer.from('# Buffer Title\n\nContent from CLI.');
      const result = await intakeMaterial(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
          file: {
            name: 'buffer-note.md',
            data: buffer,
            type: 'text/markdown',
            size: buffer.length,
          },
          title: 'Custom Title Buffer',
        },
        { storageDriver: mockStorage },
      );

      expect(result.id).toBe('mat-uuid-1234');
      expect(result.title).toBe('Custom Title Buffer');
      expect(result.filename).toBe('buffer-note.md');
      expect(result.fileType).toBe('text/markdown');
      expect(result.fileSize).toBe(buffer.length);

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${defaultProjectId}/[0-9a-f-]+-buffer-note\\.md$`)),
        buffer,
        'text/markdown',
      );
      expect(result.status).toBe('pending');
      expect(mockCreateMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: defaultProjectId,
          userId: defaultUserId,
          title: 'Custom Title Buffer',
          filename: 'buffer-note.md',
          fileType: 'text/markdown',
          fileSize: buffer.length,
        }),
      );
      expect(mockSendIngestJob).toHaveBeenCalledWith(
        expect.objectContaining({
          materialId: 'mat-uuid-1234',
          projectId: defaultProjectId,
          userId: defaultUserId,
          fileType: 'text/markdown',
        }),
      );
    });

    it('accepts Uint8Array payloads and computes size automatically', async () => {
      const uint8 = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await intakeMaterial(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
          file: {
            filename: 'binary-image.png',
            buffer: uint8,
          },
        },
        { storageDriver: mockStorage },
      );

      expect(result.filename).toBe('binary-image.png');
      expect(result.fileType).toBe('image/png');
      expect(result.fileSize).toBe(5);
      expect(mockUpload).toHaveBeenCalled();
    });

    it('accepts string data in descriptor payload', async () => {
      const stringData = 'Simple plain text document content';
      const result = await intakeMaterial(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
          file: {
            name: 'notes.txt',
            data: stringData,
          },
        },
        { storageDriver: mockStorage },
      );

      expect(result.filename).toBe('notes.txt');
      expect(result.fileType).toBe('text/plain');
      expect(result.fileSize).toBe(Buffer.byteLength(stringData));
    });

    it('accepts Blob in descriptor payload and resolves size correctly', async () => {
      const blob = new Blob(['blob content for test'], { type: 'text/markdown' });
      const result = await intakeMaterial(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
          file: {
            name: 'blob-note.md',
            data: blob,
          },
        },
        { storageDriver: mockStorage },
      );

      expect(result.filename).toBe('blob-note.md');
      expect(result.fileType).toBe('text/markdown');
      expect(result.fileSize).toBe(blob.size);
    });

    it('rejects disallowed file extensions even when spoofed with valid MIME type', async () => {
      await expect(
        intakeMaterial(
          {
            projectId: defaultProjectId,
            userId: defaultUserId,
            file: {
              name: 'malware.exe',
              data: Buffer.from('fake image'),
              type: 'image/png',
            },
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);

      expect(mockUpload).not.toHaveBeenCalled();
      expect(mockCreateMaterial).not.toHaveBeenCalled();
    });

    it('rejects oversized Blob in descriptor payload', async () => {
      const hugeBlob = new Blob(['x'], { type: 'application/pdf' });
      Object.defineProperty(hugeBlob, 'size', { value: MAX_MATERIAL_FILE_SIZE + 100 });

      await expect(
        intakeMaterial(
          {
            projectId: defaultProjectId,
            userId: defaultUserId,
            file: {
              name: 'giant.pdf',
              data: hugeBlob,
            },
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow(ChatbotError);
    });
  });

  describe('Storage Upload & Unique Path Generation', () => {
    it('uploads to storage with project prefix, unique UUID, and sanitized filename', async () => {
      const file = new File(['sample'], 'Complex Name (V2) [Final].pdf', {
        type: 'application/pdf',
      });

      const result = await intakeMaterial(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
          file,
        },
        { storageDriver: mockStorage },
      );

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringMatching(
          new RegExp(`^${defaultProjectId}/[0-9a-f-]{36}-Complex_Name_V2_Final\\.pdf$`),
        ),
        file,
        'application/pdf',
      );
      expect(result.storagePath).toMatch(
        new RegExp(`^${defaultProjectId}/[0-9a-f-]{36}-Complex_Name_V2_Final\\.pdf$`),
      );
    });
  });

  describe('Metadata & Title Handling', () => {
    it('defaults title to filename when title is not provided or empty', async () => {
      const file = new File(['content'], 'syllabus.pdf', { type: 'application/pdf' });
      const result = await intakeMaterial(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
          file,
          title: '   ',
        },
        { storageDriver: mockStorage },
      );

      expect(result.title).toBe('syllabus.pdf');
    });

    it('merges custom metadata with intake lifecycle metadata', async () => {
      const file = new File(['notes'], 'lecture.md', { type: 'text/markdown' });
      await intakeMaterial(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
          file,
          metadata: {
            course: 'CS101',
            week: 3,
          },
        },
        { storageDriver: mockStorage },
      );

      expect(mockCreateMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            course: 'CS101',
            week: 3,
            intake: expect.objectContaining({
              originalFilename: 'lecture.md',
              sanitizedFilename: 'lecture.md',
            }),
          }),
        }),
      );
    });
  });

  describe('Rollback & Storage Cleanup on Failure', () => {
    it('cleans up uploaded storage file if database insert fails', async () => {
      mockCreateMaterial.mockRejectedValueOnce(new Error('Database connection failed'));

      const file = new File(['test'], 'doc.pdf', { type: 'application/pdf' });

      await expect(
        intakeMaterial(
          {
            projectId: defaultProjectId,
            userId: defaultUserId,
            file,
          },
          { storageDriver: mockStorage },
        ),
      ).rejects.toThrow('Database connection failed');

      expect(mockUpload).toHaveBeenCalled();
      expect(mockDelete).toHaveBeenCalledWith(
        expect.stringMatching(new RegExp(`^${defaultProjectId}/`)),
      );
      expect(mockSendIngestJob).not.toHaveBeenCalled();
    });
  });

  describe('In-Process Integration with LocalStorageDriver', () => {
    it('exercises intake flow end-to-end using real LocalStorageDriver and DB mock', async () => {
      const localDriver = new LocalStorageDriver(`/tmp/test-storage-intake-${Date.now()}`);
      const uploadSpy = vi.spyOn(localDriver, 'upload');

      const file = new File(['# Real Local Content'], 'local-test.md', {
        type: 'text/markdown',
      });

      const material = await intakeMaterial(
        {
          projectId: defaultProjectId,
          userId: defaultUserId,
          file,
          title: 'Local Driver Test',
        },
        { storageDriver: localDriver },
      );

      expect(material.id).toBe('mat-uuid-1234');
      expect(material.status).toBe('pending');
      expect(uploadSpy).toHaveBeenCalled();
      expect(mockCreateMaterial).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Local Driver Test',
          filename: 'local-test.md',
        }),
      );
      expect(mockSendIngestJob).toHaveBeenCalledWith(
        expect.objectContaining({
          materialId: 'mat-uuid-1234',
        }),
      );
    });
  });
});
