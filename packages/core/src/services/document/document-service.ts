import type { Buffer } from 'node:buffer';
import * as path from 'node:path';
import { desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../../infrastructure/db/db.js';
import { documents } from '../../infrastructure/db/schema/documents.js';
import type { StorageService } from '../../infrastructure/storage/storage-service.js';
import type { DocumentEntity } from '../../shared/types/document.js';

export class DocumentService {
  constructor(private storageService: StorageService) {}

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

    // Save document metadata record into database
    const timestamp = Date.now();
    try {
      const [inserted] = await db
        .insert(documents)
        .values({
          id: documentId,
          userId,
          name: safeFilename,
          storagePath,
          fileSize: fileBuffer.length,
          status: 'pending',
          createdAt: timestamp,
          updatedAt: timestamp,
        })
        .returning();

      if (!inserted) {
        throw new Error('Failed to insert document metadata');
      }

      return inserted;
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
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt))
      .all();
  }
}
