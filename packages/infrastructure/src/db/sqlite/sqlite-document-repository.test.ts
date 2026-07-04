import { describe, expect, it } from 'vitest';
import { SqliteDocumentRepository } from './sqlite-document-repository.js';

describe('SqliteDocumentRepository', () => {
  it('creates, finds, lists, and deletes document records', async () => {
    const repository = new SqliteDocumentRepository();
    const docId = `test-doc-${Date.now()}`;
    const userId = `test-user-${Date.now()}`;

    // Create
    const created = await repository.create({
      id: docId,
      userId,
      name: 'test-document.pdf',
      storagePath: `users/${userId}/documents/${docId}-test-document.pdf`,
      fileSize: 1024,
      status: 'pending',
    });

    expect(created.id).toBe(docId);
    expect(created.userId).toBe(userId);
    expect(created.name).toBe('test-document.pdf');
    expect(created.createdAt).toBeGreaterThan(0);
    expect(created.updatedAt).toBeGreaterThan(0);

    // FindById
    const found = await repository.findById(docId);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(docId);

    // ListByUserId
    const userDocs = await repository.listByUserId(userId);
    expect(userDocs).toHaveLength(1);
    expect(userDocs[0]?.id).toBe(docId);

    // Delete
    await repository.delete(docId);
    const afterDelete = await repository.findById(docId);
    expect(afterDelete).toBeNull();
  });
});
