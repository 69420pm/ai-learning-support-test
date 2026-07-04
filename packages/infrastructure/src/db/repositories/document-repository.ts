import type { DocumentEntity } from '@ai-learning-support/shared';

export type CreateDocumentInput = Omit<DocumentEntity, 'createdAt' | 'updatedAt'>;

export interface DocumentRepository {
  create(input: CreateDocumentInput): Promise<DocumentEntity>;
  findById(id: string): Promise<DocumentEntity | null>;
  listByUserId(userId: string): Promise<DocumentEntity[]>;
  delete(id: string): Promise<void>;
}
