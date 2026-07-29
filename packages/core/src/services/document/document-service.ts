import type { Buffer } from 'node:buffer';
import * as path from 'node:path';
import type {
  DocumentEntity,
  DocumentRepository,
  StorageService,
} from '@ai-learning-support/shared';
import { v4 as uuidv4 } from 'uuid';

export class DocumentService {
  constructor(
    private storageService: StorageService,
    private documentRepository: DocumentRepository,
  ) {}

  async uploadDocument(
    userId: string,
    filename: string,
    fileBuffer: Buffer,
  ): Promise<DocumentEntity> {
    const documentId = uuidv4();
    const safeFilename = path.basename(filename).replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = `users/${userId}/documents/${documentId}-${safeFilename}`;

    // Save file content buffer to storage
    await this.storageService.uploadFile(storagePath, fileBuffer);

    // Save document metadata record into repository
    try {
      return await this.documentRepository.create({
        id: documentId,
        userId,
        name: safeFilename,
        storagePath,
        fileSize: fileBuffer.length,
        status: 'pending',
      });
    } catch (error) {
      try {
        await this.storageService.deleteFile(storagePath);
      } catch (cleanupError) {
        console.error('Failed to delete orphan file:', cleanupError);
      }
      throw error;
    }
  }

  async listDocuments(userId: string): Promise<DocumentEntity[]> {
    return await this.documentRepository.listByUserId(userId);
  }
}
