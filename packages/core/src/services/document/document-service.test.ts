import { db, documents, type StorageService } from '@ai-learning-support/infrastructure';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentService } from './document-service.js';

describe('DocumentService', () => {
  const mockStorageService = {
    uploadFile: vi.fn(),
    getFile: vi.fn(),
    deleteFile: vi.fn(),
    getFileUrl: vi.fn(),
  } as unknown as StorageService;

  const documentService = new DocumentService(mockStorageService);

  beforeEach(async () => {
    vi.clearAllMocks();
    await db.delete(documents);
  });

  it('should upload document and save metadata', async () => {
    const userId = 'user-123';
    const filename = 'test-doc.pdf';
    const fileBuffer = Buffer.from('pdf-contents');

    vi.mocked(mockStorageService.uploadFile).mockResolvedValue('success-path');

    const result = await documentService.uploadDocument(userId, filename, fileBuffer);

    // Assert storage upload was called
    expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(1);
    const uploadCall = vi.mocked(mockStorageService.uploadFile).mock.calls[0];
    expect(uploadCall).toBeDefined();
    if (!uploadCall) {
      throw new Error('uploadCall is undefined');
    }
    const storagePath = uploadCall[0];
    expect(storagePath).toMatch(
      new RegExp(`^users/${userId}/documents/[a-f0-9-]{36}-${filename}$`),
    );
    expect(uploadCall[1]).toBe(fileBuffer);

    // Assert DB insertion
    const allDocs = await db.select().from(documents).all();
    expect(allDocs).toHaveLength(1);
    const doc = allDocs[0];
    expect(doc).toBeDefined();
    if (!doc) {
      throw new Error('doc is undefined');
    }
    expect(doc.id).toBeDefined();
    expect(doc.userId).toBe(userId);
    expect(doc.name).toBe(filename);
    expect(doc.storagePath).toBe(storagePath);
    expect(doc.fileSize).toBe(fileBuffer.length);
    expect(doc.status).toBe('pending');
    expect(doc.createdAt).toBeLessThanOrEqual(Date.now());
    expect(doc.updatedAt).toBeLessThanOrEqual(Date.now());

    // Assert returned object
    expect(result).toEqual(doc);
  });

  it('should list documents for user', async () => {
    const userId = 'user-123';
    const otherUserId = 'user-456';

    // Insert records manually with different timestamps
    await db.insert(documents).values([
      {
        id: 'doc-1',
        userId,
        name: 'first.pdf',
        storagePath: 'users/user-123/documents/doc-1-first.pdf',
        fileSize: 100,
        status: 'pending',
        createdAt: 1000,
        updatedAt: 1000,
      },
      {
        id: 'doc-2',
        userId,
        name: 'second.pdf',
        storagePath: 'users/user-123/documents/doc-2-second.pdf',
        fileSize: 200,
        status: 'pending',
        createdAt: 2000, // newer
        updatedAt: 2000,
      },
      {
        id: 'doc-3',
        userId: otherUserId,
        name: 'other.pdf',
        storagePath: 'users/user-456/documents/doc-3-other.pdf',
        fileSize: 300,
        status: 'pending',
        createdAt: 1500,
        updatedAt: 1500,
      },
    ]);

    const results = await documentService.listDocuments(userId);

    // Assert ordering and filtering
    expect(results).toHaveLength(2);
    expect(results[0]).toBeDefined();
    expect(results[1]).toBeDefined();
    expect(results[0]?.id).toBe('doc-2');
    expect(results[1]?.id).toBe('doc-1');
  });
});
