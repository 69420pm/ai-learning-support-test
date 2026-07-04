import type { DocumentRepository, StorageService } from '@ai-learning-support/infrastructure';
import type { DocumentEntity } from '@ai-learning-support/shared';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentService } from './document-service.js';

describe('DocumentService', () => {
  const mockStorageService = {
    uploadFile: vi.fn(),
    getFile: vi.fn(),
    deleteFile: vi.fn(),
    getFileUrl: vi.fn(),
  } as unknown as StorageService;

  const mockDocumentRepository = {
    create: vi.fn(),
    findById: vi.fn(),
    listByUserId: vi.fn(),
    delete: vi.fn(),
  } as unknown as DocumentRepository;

  const documentService = new DocumentService(mockStorageService, mockDocumentRepository);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload document and save metadata via DocumentRepository', async () => {
    const userId = 'user-123';
    const filename = 'test-doc.pdf';
    const fileBuffer = Buffer.from('pdf-contents');

    const expectedDoc: DocumentEntity = {
      id: 'mock-doc-id',
      userId,
      name: filename,
      storagePath: `users/${userId}/documents/mock-doc-id-${filename}`,
      fileSize: fileBuffer.length,
      status: 'pending',
      createdAt: 1000,
      updatedAt: 1000,
    };

    vi.mocked(mockStorageService.uploadFile).mockResolvedValue('success-path');
    vi.mocked(mockDocumentRepository.create).mockResolvedValue(expectedDoc);

    const result = await documentService.uploadDocument(userId, filename, fileBuffer);

    expect(mockStorageService.uploadFile).toHaveBeenCalledTimes(1);
    expect(mockDocumentRepository.create).toHaveBeenCalledTimes(1);
    expect(result).toEqual(expectedDoc);
  });

  it('should list documents for user via DocumentRepository', async () => {
    const userId = 'user-123';
    const docsList: DocumentEntity[] = [
      {
        id: 'doc-1',
        userId,
        name: 'test.pdf',
        storagePath: 'path/1',
        fileSize: 100,
        status: 'pending',
        createdAt: 2000,
        updatedAt: 2000,
      },
    ];

    vi.mocked(mockDocumentRepository.listByUserId).mockResolvedValue(docsList);

    const results = await documentService.listDocuments(userId);

    expect(mockDocumentRepository.listByUserId).toHaveBeenCalledWith(userId);
    expect(results).toEqual(docsList);
  });

  it('should delete uploaded storage file if repository creation fails', async () => {
    const userId = 'user-123';
    const filename = 'test-doc.pdf';
    const fileBuffer = Buffer.from('pdf-contents');

    vi.mocked(mockStorageService.uploadFile).mockResolvedValue('success-path');
    vi.mocked(mockDocumentRepository.create).mockRejectedValue(new Error('DB Insert Failed'));

    await expect(documentService.uploadDocument(userId, filename, fileBuffer)).rejects.toThrow(
      'DB Insert Failed',
    );

    expect(mockStorageService.deleteFile).toHaveBeenCalledTimes(1);
  });
});
