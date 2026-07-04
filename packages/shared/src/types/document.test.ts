import { describe, expect, it } from 'vitest';
import type { DocumentEntity, DocumentStatus } from './document.js';

describe('Document Entity Types', () => {
  it('allows instantiating a valid DocumentEntity object', () => {
    const status: DocumentStatus = 'pending';
    const doc: DocumentEntity = {
      id: 'doc-123',
      userId: 'user-456',
      name: 'sample.pdf',
      storagePath: 'users/user-456/documents/doc-123-sample.pdf',
      fileSize: 1024,
      status,
      createdAt: 1000,
      updatedAt: 1000,
    };

    expect(doc.id).toBe('doc-123');
    expect(doc.status).toBe('pending');
  });
});
