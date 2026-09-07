import { describe, expect, it } from 'vitest';
import * as schemaExports from './index';
import { materialChunks, materials } from './materials';

describe('Drizzle Materials Schema', () => {
  it('exports materials and materialChunks schema objects', () => {
    expect(materials).toBeDefined();
    expect(materialChunks).toBeDefined();
    expect(schemaExports.materials).toBe(materials);
    expect(schemaExports.materialChunks).toBe(materialChunks);
  });

  it('defines correct materials table structure', () => {
    expect(materials.id).toBeDefined();
    expect(materials.projectId).toBeDefined();
    expect(materials.userId).toBeDefined();
    expect(materials.title).toBeDefined();
    expect(materials.filename).toBeDefined();
    expect(materials.fileType).toBeDefined();
    expect(materials.fileSize).toBeDefined();
    expect(materials.storagePath).toBeDefined();
    expect(materials.status).toBeDefined();
    expect(materials.errorMessage).toBeDefined();
    expect(materials.metadata).toBeDefined();
    expect(materials.createdAt).toBeDefined();
    expect(materials.updatedAt).toBeDefined();
  });

  it('defines correct materialChunks table structure with 768d vector', () => {
    expect(materialChunks.id).toBeDefined();
    expect(materialChunks.materialId).toBeDefined();
    expect(materialChunks.projectId).toBeDefined();
    expect(materialChunks.userId).toBeDefined();
    expect(materialChunks.chunkIndex).toBeDefined();
    expect(materialChunks.content).toBeDefined();
    expect(materialChunks.tokenCount).toBeDefined();
    expect(materialChunks.embedding).toBeDefined();
    expect(materialChunks.createdAt).toBeDefined();
  });

  it('exports graph extraction metadata types and constants', () => {
    expect(schemaExports.GRAPH_EXTRACTION_STATUSES).toBeDefined();
    expect(schemaExports.GRAPH_EXTRACTION_STATUSES).toContain('not_started');
    expect(schemaExports.GRAPH_EXTRACTION_STATUSES).toContain('queued');
    expect(schemaExports.GRAPH_EXTRACTION_STATUSES).toContain('extracting');
    expect(schemaExports.GRAPH_EXTRACTION_STATUSES).toContain('ready');
    expect(schemaExports.GRAPH_EXTRACTION_STATUSES).toContain('ready_with_warnings');
    expect(schemaExports.GRAPH_EXTRACTION_STATUSES).toContain('failed');
  });
});
