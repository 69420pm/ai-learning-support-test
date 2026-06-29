export { db } from "./database/db.js";
export { type DocumentRow, documents, type NewDocumentRow } from "./database/schema/documents.js";
export * from "./services/document/document-service.js";
export * from "./storage/local-storage.js";
export * from "./storage/storage-service.js";
export * from "./types/document.js";

// Preserve existing exports to keep the integration tests green
export const core = () => "core";
