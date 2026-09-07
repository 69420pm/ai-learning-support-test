import { getTableConfig } from 'drizzle-orm/pg-core';
import { describe, expect, it } from 'vitest';
import * as schemaExports from './index';
import {
  EXERCISE_QUESTION_TYPES,
  exercises,
  knowledgeComponents,
  knowledgeDependencies,
  PACER_CATEGORIES,
} from './knowledge';

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

  it('exports exercises schema object and EXERCISE_QUESTION_TYPES', () => {
    expect(exercises).toBeDefined();
    expect(schemaExports.exercises).toBe(exercises);
    expect(EXERCISE_QUESTION_TYPES).toEqual([
      'multiple_choice',
      'calculation',
      'conceptual',
      'code',
    ]);
  });

  it('defines correct exercises table columns and types', () => {
    expect(exercises.id).toBeDefined();
    expect(exercises.projectId).toBeDefined();
    expect(exercises.userId).toBeDefined();
    expect(exercises.materialId).toBeDefined();
    expect(exercises.kcId).toBeDefined();
    expect(exercises.pageNumber).toBeDefined();
    expect(exercises.title).toBeDefined();
    expect(exercises.prompt).toBeDefined();
    expect(exercises.solution).toBeDefined();
    expect(exercises.questionType).toBeDefined();
    expect(exercises.difficulty).toBeDefined();
    expect(exercises.createdAt).toBeDefined();
  });

  it('configures cascade deletion on exercises foreign keys while preserving knowledgeComponents', () => {
    const exercisesConfig = getTableConfig(exercises);
    const kcConfig = getTableConfig(knowledgeComponents);

    const fks = exercisesConfig.foreignKeys;
    expect(fks.length).toBe(4);

    // All 4 FKs on exercises should be onDelete: 'cascade'
    for (const fk of fks) {
      expect(fk.onDelete).toBe('cascade');
    }

    // Identify specific foreign keys by their local columns
    const materialFk = fks.find((fk) =>
      fk.reference().columns.some((col) => col.name === 'material_id'),
    );
    expect(materialFk).toBeDefined();
    expect(materialFk?.onDelete).toBe('cascade');

    const kcFk = fks.find((fk) => fk.reference().columns.some((col) => col.name === 'kc_id'));
    expect(kcFk).toBeDefined();
    expect(kcFk?.onDelete).toBe('cascade');

    // For knowledgeComponents: sourceMaterialId is onDelete: set null (preserving KCs upon material deletion)
    const kcFks = kcConfig.foreignKeys;
    const kcMaterialFk = kcFks.find((fk) =>
      fk.reference().columns.some((col) => col.name === 'source_material_id'),
    );
    expect(kcMaterialFk).toBeDefined();
    expect(kcMaterialFk?.onDelete).toBe('set null');
  });
});
