import { describe, expect, it } from 'vitest';
import * as schemaExports from './index';
import { knowledgeComponents, knowledgeDependencies, PACER_CATEGORIES } from './knowledge';

describe('Drizzle Knowledge Graph Schema', () => {
  it('exports knowledgeComponents and knowledgeDependencies schema objects', () => {
    expect(knowledgeComponents).toBeDefined();
    expect(knowledgeDependencies).toBeDefined();
    expect(schemaExports.knowledgeComponents).toBe(knowledgeComponents);
    expect(schemaExports.knowledgeDependencies).toBe(knowledgeDependencies);
  });

  it('defines correct knowledgeComponents table columns and types', () => {
    expect(knowledgeComponents.id).toBeDefined();
    expect(knowledgeComponents.projectId).toBeDefined();
    expect(knowledgeComponents.userId).toBeDefined();
    expect(knowledgeComponents.slug).toBeDefined();
    expect(knowledgeComponents.name).toBeDefined();
    expect(knowledgeComponents.pacerCategory).toBeDefined();
    expect(knowledgeComponents.bloomLevel).toBeDefined();
    expect(knowledgeComponents.aliases).toBeDefined();
    expect(knowledgeComponents.embedding).toBeDefined();
    expect(knowledgeComponents.sourceMaterialId).toBeDefined();
    expect(knowledgeComponents.status).toBeDefined();
    expect(knowledgeComponents.orderIndex).toBeDefined();
    expect(knowledgeComponents.createdAt).toBeDefined();
    expect(knowledgeComponents.updatedAt).toBeDefined();
  });

  it('defines correct knowledgeDependencies table columns and types', () => {
    expect(knowledgeDependencies.id).toBeDefined();
    expect(knowledgeDependencies.projectId).toBeDefined();
    expect(knowledgeDependencies.sourceKcId).toBeDefined();
    expect(knowledgeDependencies.targetKcId).toBeDefined();
    expect(knowledgeDependencies.relationshipType).toBeDefined();
    expect(knowledgeDependencies.reasoning).toBeDefined();
    expect(knowledgeDependencies.isTransitive).toBeDefined();
    expect(knowledgeDependencies.sourceMaterialId).toBeDefined();
    expect(knowledgeDependencies.createdAt).toBeDefined();
  });

  it('exports valid PACER_CATEGORIES matching the spec', () => {
    expect(PACER_CATEGORIES).toEqual([
      'procedural',
      'analogous',
      'conceptual',
      'evidence',
      'reference',
    ]);
  });
});
