import { describe, expect, it } from 'vitest';
import { createDocumentService } from './factory.js';
import { DocumentService } from './services/document/document-service.js';

describe('createDocumentService factory', () => {
  it('instantiates and returns a DocumentService instance', () => {
    const service = createDocumentService();
    expect(service).toBeInstanceOf(DocumentService);
  });
});
