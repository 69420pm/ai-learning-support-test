import type { DocumentEntity } from '@ai-learning-support/shared';
import { desc, eq } from 'drizzle-orm';
import type {
  CreateDocumentInput,
  DocumentRepository,
} from '../repositories/document-repository.js';
import { documents } from '../schema/documents.js';
import { db } from './sqlite-client.js';

export class SqliteDocumentRepository implements DocumentRepository {
  async create(input: CreateDocumentInput): Promise<DocumentEntity> {
    const timestamp = Date.now();
    const [inserted] = await db
      .insert(documents)
      .values({
        id: input.id,
        userId: input.userId,
        name: input.name,
        storagePath: input.storagePath,
        fileSize: input.fileSize,
        status: input.status,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .returning();

    if (!inserted) {
      throw new Error(`Failed to insert document with ID ${input.id}`);
    }

    return inserted;
  }

  async findById(id: string): Promise<DocumentEntity | null> {
    const [result] = await db.select().from(documents).where(eq(documents.id, id)).limit(1);

    return result ?? null;
  }

  async listByUserId(userId: string): Promise<DocumentEntity[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt))
      .all();
  }

  async delete(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }
}
