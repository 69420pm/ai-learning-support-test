import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type {
  Exercise,
  KnowledgeComponent,
  MaterialChunk,
} from '@/lib/hooks/use-concept-inspection';
import type { KnowledgeDependency, Material } from '@/lib/hooks/use-project-graph';
import { ConceptInspectorDrawer } from './concept-inspector-drawer';

describe('ConceptInspectorDrawer Component', () => {
  const mockComponent: KnowledgeComponent = {
    id: 'kc-1',
    projectId: 'proj-1',
    userId: 'user-1',
    slug: 'eigenvalues-eigenvectors',
    name: 'Eigenvalues & Eigenvectors',
    pacerCategory: 'conceptual',
    bloomLevel: 4,
    aliases: ['Characteristic Values', 'Eigenpairs'],
    embedding: new Array(768).fill(0.01),
    sourceMaterialId: 'mat-1',
    status: 'active',
    orderIndex: 3,
    createdAt: new Date('2026-09-01T12:00:00Z'),
    updatedAt: new Date('2026-09-02T15:30:00Z'),
  };

  const allComponents: KnowledgeComponent[] = [
    {
      id: 'kc-prev',
      projectId: 'proj-1',
      userId: 'user-1',
      slug: 'matrix-determinants',
      name: 'Matrix Determinants',
      pacerCategory: 'procedural',
      bloomLevel: 3,
      aliases: [],
      embedding: null,
      sourceMaterialId: 'mat-1',
      status: 'active',
      orderIndex: 2,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    mockComponent,
    {
      id: 'kc-next',
      projectId: 'proj-1',
      userId: 'user-1',
      slug: 'diagonalization',
      name: 'Matrix Diagonalization',
      pacerCategory: 'procedural',
      bloomLevel: 5,
      aliases: [],
      embedding: null,
      sourceMaterialId: 'mat-1',
      status: 'active',
      orderIndex: 4,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const dependencies: KnowledgeDependency[] = [
    {
      id: 'kd-1',
      projectId: 'proj-1',
      sourceKcId: 'kc-prev',
      targetKcId: 'kc-1',
      relationshipType: 'prerequisite',
      reasoning: 'Finding roots of the characteristic polynomial requires determinant computation.',
      isTransitive: false,
      sourceMaterialId: 'mat-1',
      createdAt: new Date(),
    },
    {
      id: 'kd-2',
      projectId: 'proj-1',
      sourceKcId: 'kc-1',
      targetKcId: 'kc-next',
      relationshipType: 'prerequisite',
      reasoning: 'Diagonalization decomposes a matrix using its basis of eigenvectors.',
      isTransitive: false,
      sourceMaterialId: 'mat-1',
      createdAt: new Date(),
    },
  ];

  const exercises: Exercise[] = [
    {
      id: 'ex-1',
      projectId: 'proj-1',
      userId: 'user-1',
      materialId: 'mat-1',
      kcId: 'kc-1',
      pageNumber: 84,
      title: 'Eigenvalue Calculation for 2x2 Matrix',
      prompt: 'Given matrix A = [[2, 1], [1, 2]], compute the eigenvalues.',
      solution: 'det(A - lambda*I) = (2 - lambda)^2 - 1 = 0 => lambda = 1, 3.',
      questionType: 'calculation',
      difficulty: 3,
      createdAt: new Date(),
    },
  ];

  const chunks: MaterialChunk[] = [
    {
      id: 'chunk-1',
      projectId: 'proj-1',
      userId: 'user-1',
      materialId: 'mat-1',
      chunkIndex: 12,
      content:
        'Let A be an n x n matrix. A scalar lambda is called an eigenvalue of A if there exists a non-zero vector v such that Av = lambda v.',
      tokenCount: 45,
      embedding: null,
      metadata: { pageNumber: 84 },
      createdAt: new Date(),
    },
  ];

  const materials: Material[] = [
    {
      id: 'mat-1',
      projectId: 'proj-1',
      userId: 'user-1',
      title: 'Linear Algebra and Its Applications',
      filename: 'linear_algebra.pdf',
      fileType: 'application/pdf',
      fileSize: 1048576,
      storagePath: 'proj-1/linear_algebra.pdf',
      status: 'ready',
      errorMessage: null,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  it('renders nothing when concept is null and drawer is closed', () => {
    const html = renderToString(
      <ConceptInspectorDrawer
        concept={null}
        allComponents={[]}
        dependencies={[]}
        materials={[]}
        projectId="proj-1"
        onClose={vi.fn()}
      />,
    );
    expect(html).toBe('');
  });

  it('renders drawer header, concept badges, close button, and 5 tab triggers', () => {
    const html = renderToString(
      <ConceptInspectorDrawer
        concept={mockComponent}
        allComponents={allComponents}
        dependencies={dependencies}
        exercises={exercises}
        chunks={chunks}
        materials={materials}
        projectId="proj-1"
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('data-testid="concept-inspector-drawer"');
    expect(html).toContain('data-testid="concept-inspector-close"');
    expect(html).toContain('data-testid="inspector-concept-title"');
    expect(html).toContain('Eigenvalues &amp; Eigenvectors');
    expect(html).toContain('data-testid="tab-trigger-overview"');
    expect(html).toContain('data-testid="tab-trigger-dependencies"');
    expect(html).toContain('data-testid="tab-trigger-exercises"');
    expect(html).toContain('data-testid="tab-trigger-source"');
    expect(html).toContain('data-testid="tab-trigger-debug"');
  });

  it('renders Overview tab content with slug, PACER details, Bloom stage info, and aliases', () => {
    const html = renderToString(
      <ConceptInspectorDrawer
        concept={mockComponent}
        allComponents={allComponents}
        dependencies={dependencies}
        exercises={exercises}
        chunks={chunks}
        materials={materials}
        projectId="proj-1"
        defaultTab="overview"
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('data-testid="concept-slug"');
    expect(html).toContain('eigenvalues-eigenvectors');
    expect(html).toContain('data-testid="concept-pacer"');
    expect(html).toContain('Conceptual');
    expect(html).toContain('data-testid="concept-bloom"');
    expect(html).toContain('Analyze');
    expect(html).toContain('data-testid="concept-aliases"');
    expect(html).toContain('Characteristic Values');
    expect(html).toContain('Eigenpairs');
  });

  it('renders Dependencies tab with direct prerequisites, unlocked concepts, and AI extraction reasoning', () => {
    const html = renderToString(
      <ConceptInspectorDrawer
        concept={mockComponent}
        allComponents={allComponents}
        dependencies={dependencies}
        exercises={exercises}
        chunks={chunks}
        materials={materials}
        projectId="proj-1"
        defaultTab="dependencies"
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('data-testid="direct-prerequisites-title"');
    expect(html).toContain('Matrix Determinants');
    expect(html).toContain(
      'Finding roots of the characteristic polynomial requires determinant computation.',
    );
    expect(html).toContain('data-testid="unlocked-concepts-title"');
    expect(html).toContain('Matrix Diagonalization');
    expect(html).toContain('Diagonalization decomposes a matrix using its basis of eigenvectors.');
  });

  it('renders Grounded Exercises tab with question type, prompt, solution, page attribution, and difficulty', () => {
    const html = renderToString(
      <ConceptInspectorDrawer
        concept={mockComponent}
        allComponents={allComponents}
        dependencies={dependencies}
        exercises={exercises}
        chunks={chunks}
        materials={materials}
        projectId="proj-1"
        defaultTab="exercises"
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('data-testid="grounded-exercises-list"');
    expect(html).toContain('data-testid="exercise-card-ex-1"');
    expect(html).toContain('data-testid="exercise-type"');
    expect(html).toContain('calculation');
    expect(html).toContain('data-testid="exercise-page"');
    expect(html).toContain('84');
    expect(html).toContain('data-testid="exercise-difficulty"');
    expect(html).toContain('data-testid="exercise-prompt"');
    expect(html).toContain('Given matrix A = [[2, 1], [1, 2]]');
    expect(html).toContain('data-testid="exercise-solution"');
    expect(html).toContain('det(A - lambda*I)');
  });

  it('renders Source Attribution tab with material title, link, and chunks with page number', () => {
    const html = renderToString(
      <ConceptInspectorDrawer
        concept={mockComponent}
        allComponents={allComponents}
        dependencies={dependencies}
        exercises={exercises}
        chunks={chunks}
        materials={materials}
        projectId="proj-1"
        defaultTab="source"
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('data-testid="source-material-name"');
    expect(html).toContain('Linear Algebra and Its Applications');
    expect(html).toContain('data-testid="source-material-link"');
    expect(html).toContain('/projects/proj-1/materials');
    expect(html).toContain('data-testid="source-chunks-list"');
    expect(html).toContain('data-testid="chunk-card-chunk-1"');
    expect(html).toContain('Let A be an n x n matrix');
  });

  it('renders Debug / Raw Data tab with 768-dim vector embedding diagnostics, timestamps, formatted JSON, and copy button', () => {
    const html = renderToString(
      <ConceptInspectorDrawer
        concept={mockComponent}
        allComponents={allComponents}
        dependencies={dependencies}
        exercises={exercises}
        chunks={chunks}
        materials={materials}
        projectId="proj-1"
        defaultTab="debug"
        onClose={vi.fn()}
      />,
    );

    expect(html).toContain('data-testid="embedding-diagnostics"');
    expect(html).toContain('768');
    expect(html).toContain('data-testid="extraction-timestamps"');
    expect(html).toContain('data-testid="raw-json-payload"');
    expect(html).toContain('data-testid="copy-json-button"');
  });
});
