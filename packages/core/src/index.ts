export { db } from './infrastructure/db/db.js';
export {
  type DocumentRow,
  documents,
  type NewDocumentRow,
} from './infrastructure/db/schema/documents.js';
export * from './infrastructure/storage/local-storage.js';
export * from './infrastructure/storage/storage-service.js';
export * from './services/document/document-service.js';
export * from './shared/types/document.js';

// Preserve existing exports to keep the integration tests green
export const core = () => 'core';
