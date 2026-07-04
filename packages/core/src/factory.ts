import {
  LocalFileSystemStorage,
  SqliteDocumentRepository,
} from '@ai-learning-support/infrastructure';
import { DocumentService } from './services/document/document-service.js';

export function createDocumentService(): DocumentService {
  // biome-ignore lint/complexity/useLiteralKeys: process.env indexing is required by tsconfig noUncheckedIndexedAccess
  const mode = process.env['APP_MODE'] || 'local';

  if (mode === 'cloud') {
    throw new Error('Cloud mode (Supabase) is not yet configured.');
  }

  const storage = new LocalFileSystemStorage();
  const repository = new SqliteDocumentRepository();
  return new DocumentService(storage, repository);
}
