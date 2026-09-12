import { expect, test } from '@playwright/test';
import { createEmptyDiagnostics } from '@/lib/learning/graph-diagnostics';
import { KnowledgeGraphPage } from '../pages/knowledge-graph';

test.describe('Interactive Knowledge Graph Canvas & Dual Layout Engine E2E', () => {
  const mockUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const mockProjectId = '11111111-1111-4111-a111-111111111111';

  test.beforeEach(async ({ page }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.context().addCookies([
      {
        name: 'sb-mock-auth',
        value: JSON.stringify({
          id: mockUserId,
          email: 'test@example.com',
          // biome-ignore lint/style/useNamingConvention: Supabase metadata key
          user_metadata: { full_name: 'Test User' },
        }),
        domain: 'localhost',
        path: '/',
      },
    ]);
  });

  test('progressive state: empty project displays guidance to upload materials', async ({
    page,
  }) => {
    await page.route(new RegExp(`/api/projects/${mockProjectId}/graph$`), async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          components: [],
          dependencies: [],
          materials: [],
          diagnostics: createEmptyDiagnostics(),
        }),
      });
    });

    const graphPage = new KnowledgeGraphPage(page);
    await graphPage.goto(mockProjectId);

    await expect(graphPage.getEmptyState()).toBeVisible();
    await expect(page.getByText('No Learning Materials Found')).toBeVisible();
    await expect(graphPage.getUploadMaterialsLink()).toBeVisible();
  });

  test('progressive state: ready-to-extract displays action card and triggers extraction', async ({
    page,
  }) => {
    let extractionTriggered = false;

    await page.route(new RegExp(`/api/projects/${mockProjectId}/graph$`), async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          components: [],
          dependencies: [],
          materials: [
            {
              id: 'mat-1',
              projectId: mockProjectId,
              userId: mockUserId,
              title: 'Linear Algebra Slides.pdf',
              filename: 'linear_algebra.pdf',
              fileType: 'application/pdf',
              fileSize: 5000,
              status: 'ready',
              metadata: {
                graphExtraction: { status: extractionTriggered ? 'extracting' : 'not_started' },
              },
            },
          ],
          diagnostics: createEmptyDiagnostics(),
        }),
      });
    });

    await page.route(new RegExp(`/api/projects/${mockProjectId}/graph/extract`), async (route) => {
      extractionTriggered = true;
      await route.fulfill({
        status: 202,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          jobId: 'job-123',
          materialIds: ['mat-1'],
          status: 'queued',
        }),
      });
    });

    const graphPage = new KnowledgeGraphPage(page);
    await graphPage.goto(mockProjectId);

    await expect(graphPage.getReadyState()).toBeVisible();
    await expect(page.getByText('Materials Ready for Knowledge Extraction')).toBeVisible();

    const generateBtn = graphPage.getGenerateButton();
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();

    // After clicking generate, extraction feedback state or loading appears
    await expect(graphPage.getExtractingState()).toBeVisible();
  });

  test('populated graph renders canvas, nodes, directed arrows, and toolbar controls', async ({
    page,
  }) => {
    const graphData = {
      components: [
        {
          id: 'kc-1',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'vector-spaces',
          name: 'Vector Spaces',
          pacerCategory: 'conceptual',
          bloomLevel: 2,
          sourceMaterialId: 'mat-1',
        },
        {
          id: 'kc-2',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'matrix-multiplication',
          name: 'Matrix Multiplication',
          pacerCategory: 'procedural',
          bloomLevel: 3,
          sourceMaterialId: 'mat-1',
        },
        {
          id: 'kc-3',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'eigenvalues',
          name: 'Eigenvalues & Eigenvectors',
          pacerCategory: 'procedural',
          bloomLevel: 4,
          sourceMaterialId: 'mat-2',
        },
      ],
      dependencies: [
        {
          id: 'kd-1',
          projectId: mockProjectId,
          sourceKcId: 'kc-1',
          targetKcId: 'kc-2',
          relationshipType: 'prerequisite',
        },
        {
          id: 'kd-2',
          projectId: mockProjectId,
          sourceKcId: 'kc-2',
          targetKcId: 'kc-3',
          relationshipType: 'prerequisite',
        },
      ],
      materials: [
        {
          id: 'mat-1',
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'Math Notes Vol 1',
          filename: 'notes1.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
          status: 'ready',
          metadata: { graphExtraction: { status: 'ready', kcCount: 2 } },
        },
        {
          id: 'mat-2',
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'Math Notes Vol 2',
          filename: 'notes2.pdf',
          fileType: 'application/pdf',
          fileSize: 4096,
          status: 'ready',
          metadata: { graphExtraction: { status: 'ready', kcCount: 1 } },
        },
      ],
      diagnostics: {
        totalComponents: 3,
        nodeCount: 3,
        totalDependencies: 2,
        edgeCount: 2,
        orphanCount: 0,
        hasCycles: false,
        cyclePaths: [],
        pacerDistribution: {
          conceptual: 1,
          procedural: 2,
          analogous: 0,
          evidence: 0,
          reference: 0,
        },
        bloomDistribution: { 1: 0, 2: 1, 3: 1, 4: 1, 5: 0, 6: 0 },
      },
    };

    await page.route(new RegExp(`/api/projects/${mockProjectId}/graph$`), async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(graphData),
      });
    });

    const graphPage = new KnowledgeGraphPage(page);
    await graphPage.goto(mockProjectId);

    // 1. Verify Workbench and Toolbar
    await expect(graphPage.getWorkbench()).toBeVisible();
    await expect(graphPage.getToolbar()).toBeVisible();
    await expect(graphPage.getCanvas()).toBeVisible();

    // 2. Verify all 3 concept nodes rendered
    await expect(graphPage.getNode('kc-1')).toBeVisible();
    await expect(graphPage.getNode('kc-2')).toBeVisible();
    await expect(graphPage.getNode('kc-3')).toBeVisible();

    // Verify concept names
    await expect(graphPage.getNodeName('kc-1')).toHaveText('Vector Spaces');
    await expect(graphPage.getNodeName('kc-2')).toHaveText('Matrix Multiplication');
    await expect(graphPage.getNodeName('kc-3')).toHaveText('Eigenvalues & Eigenv…');

    // Verify directed edges
    await expect(graphPage.getEdge('kd-1')).toBeVisible();
    await expect(graphPage.getEdge('kd-2')).toBeVisible();

    // 3. Test Search filtering
    const searchInput = graphPage.getSearchInput();
    await searchInput.fill('Matrix');
    // Vector spaces should be dimmed (opacity-25)
    await expect(graphPage.getNode('kc-1')).toHaveClass(/opacity-25/);
    // Matrix Multiplication should have opacity-100
    await expect(graphPage.getNode('kc-2')).toHaveClass(/opacity-100/);

    // Clear search
    await searchInput.fill('');
    await expect(graphPage.getNode('kc-1')).toHaveClass(/opacity-100/);

    // 4. Test PACER Filter
    const pacerFilter = graphPage.getPacerFilter();
    await pacerFilter.selectOption('conceptual');
    await expect(graphPage.getNode('kc-1')).toBeVisible();
    await expect(graphPage.getNode('kc-2')).not.toBeVisible();
    await expect(graphPage.getNode('kc-3')).not.toBeVisible();

    // Reset PACER filter
    await pacerFilter.selectOption('all');
    await expect(graphPage.getNode('kc-2')).toBeVisible();

    // 5. Test Material Filter
    const materialFilter = graphPage.getMaterialFilter();
    await materialFilter.selectOption('mat-2');
    await expect(graphPage.getNode('kc-3')).toBeVisible();
    await expect(graphPage.getNode('kc-1')).not.toBeVisible();

    // Reset material filter
    await materialFilter.selectOption('all');
    await expect(graphPage.getNode('kc-1')).toBeVisible();

    // 6. Test Layout Switcher (DAG vs Force)
    const dagBtn = graphPage.getLayoutDagButton();
    const forceBtn = graphPage.getLayoutForceButton();
    await dagBtn.click();
    await expect(dagBtn).toHaveAttribute('aria-selected', 'true');
    await expect(forceBtn).toHaveAttribute('aria-selected', 'false');

    await forceBtn.click();
    await expect(forceBtn).toHaveAttribute('aria-selected', 'true');

    // 7. Test Zoom and Fit controls
    const zoomInBtn = graphPage.getZoomInButton();
    const zoomOutBtn = graphPage.getZoomOutButton();
    const fitViewBtn = graphPage.getFitViewButton();

    await expect(zoomInBtn).toBeVisible();
    await zoomInBtn.click();
    await zoomOutBtn.click();
    await fitViewBtn.click();

    // 8. Test node dragging with physics pinning
    const node1 = graphPage.getNode('kc-1');
    await expect(node1).toBeVisible();
    const initialBox = await node1.boundingBox();
    expect(initialBox).not.toBeNull();

    if (initialBox) {
      await page.mouse.move(
        initialBox.x + initialBox.width / 2,
        initialBox.y + initialBox.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(initialBox.x + 80, initialBox.y + 80, { steps: 5 });
      await page.mouse.up();

      const newBox = await node1.boundingBox();
      expect(newBox).not.toBeNull();
    }

    // 9. Test canvas background pan dragging
    const canvas = graphPage.getCanvas();
    const canvasBox = await canvas.boundingBox();
    expect(canvasBox).not.toBeNull();

    if (canvasBox) {
      const prePanBox = await node1.boundingBox();
      await page.mouse.move(canvasBox.x + 30, canvasBox.y + 30);
      await page.mouse.down();
      await page.mouse.move(canvasBox.x + 100, canvasBox.y + 100, { steps: 5 });
      await page.mouse.up();

      const postPanBox = await node1.boundingBox();
      expect(postPanBox).not.toBeNull();
      expect(postPanBox?.x).not.toBe(prePanBox?.x);
    }
  });

  test('top diagnostics bar accurately reflects graph health metrics', async ({ page }) => {
    const graphDataWithOrphan = {
      components: [
        {
          id: 'kc-1',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'vector-spaces',
          name: 'Vector Spaces',
          pacerCategory: 'conceptual',
          bloomLevel: 2,
        },
        {
          id: 'kc-2',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'matrix-multiplication',
          name: 'Matrix Multiplication',
          pacerCategory: 'procedural',
          bloomLevel: 3,
        },
        {
          id: 'kc-3',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'eigenvalues',
          name: 'Eigenvalues',
          pacerCategory: 'procedural',
          bloomLevel: 4,
        },
        {
          id: 'kc-orphan',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'fft',
          name: 'Fast Fourier Transform',
          pacerCategory: 'procedural',
          bloomLevel: 5,
        },
      ],
      dependencies: [
        {
          id: 'kd-1',
          projectId: mockProjectId,
          sourceKcId: 'kc-1',
          targetKcId: 'kc-2',
          relationshipType: 'prerequisite',
        },
        {
          id: 'kd-2',
          projectId: mockProjectId,
          sourceKcId: 'kc-2',
          targetKcId: 'kc-3',
          relationshipType: 'prerequisite',
        },
      ],
      materials: [
        {
          id: 'mat-1',
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'Math Notes Vol 1',
          filename: 'notes1.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
          status: 'ready',
          metadata: { graphExtraction: { status: 'ready', kcCount: 4 } },
        },
      ],
      diagnostics: {
        totalComponents: 4,
        nodeCount: 4,
        totalDependencies: 2,
        edgeCount: 2,
        orphanCount: 1,
        hasCycles: false,
        cyclePaths: [],
        pacerDistribution: {
          conceptual: 1,
          procedural: 3,
          analogous: 0,
          evidence: 0,
          reference: 0,
        },
        bloomDistribution: { 1: 0, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 },
      },
    };

    await page.route(new RegExp(`/api/projects/${mockProjectId}/graph$`), async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(graphDataWithOrphan),
      });
    });

    const graphPage = new KnowledgeGraphPage(page);
    await graphPage.goto(mockProjectId);

    await expect(graphPage.getDiagnosticsBar()).toBeVisible();
    await expect(graphPage.getDiagnosticsNodes()).toContainText('4 nodes');
    await expect(graphPage.getDiagnosticsEdges()).toContainText('2 edges');
    await expect(graphPage.getDiagnosticsOrphans()).toContainText('1 orphans');
    await expect(graphPage.getDiagnosticsCycleStatus()).toContainText('Valid DAG');
  });

  test('concept selection triggers prerequisite ancestor and downstream unlocked path highlighting while dimming unrelated nodes', async ({
    page,
  }) => {
    const graphData = {
      components: [
        {
          id: 'kc-1',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'vector-spaces',
          name: 'Vector Spaces',
          pacerCategory: 'conceptual',
          bloomLevel: 2,
          sourceMaterialId: 'mat-1',
        },
        {
          id: 'kc-2',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'matrix-multiplication',
          name: 'Matrix Multiplication',
          pacerCategory: 'procedural',
          bloomLevel: 3,
          sourceMaterialId: 'mat-1',
        },
        {
          id: 'kc-3',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'eigenvalues',
          name: 'Eigenvalues & Eigenvectors',
          pacerCategory: 'procedural',
          bloomLevel: 4,
          sourceMaterialId: 'mat-1',
        },
        {
          id: 'kc-orphan',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'fast-fourier-transform',
          name: 'Fast Fourier Transform',
          pacerCategory: 'procedural',
          bloomLevel: 5,
          sourceMaterialId: 'mat-1',
        },
      ],
      dependencies: [
        {
          id: 'kd-1',
          projectId: mockProjectId,
          sourceKcId: 'kc-1',
          targetKcId: 'kc-2',
          relationshipType: 'prerequisite',
          reasoning:
            'Vector space operations form the theoretical foundation for matrix representations.',
        },
        {
          id: 'kd-2',
          projectId: mockProjectId,
          sourceKcId: 'kc-2',
          targetKcId: 'kc-3',
          relationshipType: 'prerequisite',
          reasoning: 'Computing eigenvalues requires matrix-vector multiplication.',
        },
      ],
      materials: [
        {
          id: 'mat-1',
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'Math Notes Vol 1',
          filename: 'notes1.pdf',
          fileType: 'application/pdf',
          fileSize: 2048,
          status: 'ready',
          metadata: { graphExtraction: { status: 'ready', kcCount: 4 } },
        },
      ],
      diagnostics: {
        totalComponents: 4,
        nodeCount: 4,
        totalDependencies: 2,
        edgeCount: 2,
        orphanCount: 1,
        hasCycles: false,
        cyclePaths: [],
        pacerDistribution: {
          conceptual: 1,
          procedural: 3,
          analogous: 0,
          evidence: 0,
          reference: 0,
        },
        bloomDistribution: { 1: 0, 2: 1, 3: 1, 4: 1, 5: 1, 6: 0 },
      },
    };

    await page.route(new RegExp(`/api/projects/${mockProjectId}/graph$`), async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(graphData),
      });
    });

    await page.route(
      new RegExp(`/api/projects/${mockProjectId}/graph/components/kc-2$`),
      async (route) => {
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            component: graphData.components[1],
            exercises: [],
            chunks: [],
          }),
        });
      },
    );

    const graphPage = new KnowledgeGraphPage(page);
    await graphPage.goto(mockProjectId);

    // Initial state: all nodes have full opacity
    await expect(graphPage.getNode('kc-1')).toHaveClass(/opacity-100/);
    await expect(graphPage.getNode('kc-2')).toHaveClass(/opacity-100/);
    await expect(graphPage.getNode('kc-3')).toHaveClass(/opacity-100/);
    await expect(graphPage.getNode('kc-orphan')).toHaveClass(/opacity-100/);

    // Click middle node (kc-2: Matrix Multiplication)
    await graphPage.getNode('kc-2').click();

    // 1. Path roles
    await expect(graphPage.getNode('kc-2')).toHaveAttribute('data-path-role', 'selected');
    await expect(graphPage.getNode('kc-1')).toHaveAttribute('data-path-role', 'prerequisite');
    await expect(graphPage.getNode('kc-3')).toHaveAttribute('data-path-role', 'unlocked');
    await expect(graphPage.getNode('kc-orphan')).toHaveAttribute('data-path-role', 'none');

    // 2. Highlighting & dimming
    await expect(graphPage.getNode('kc-1')).toHaveClass(/opacity-100/);
    await expect(graphPage.getNode('kc-2')).toHaveClass(/opacity-100/);
    await expect(graphPage.getNode('kc-3')).toHaveClass(/opacity-100/);
    // Unrelated orphan node is dimmed
    await expect(graphPage.getNode('kc-orphan')).toHaveClass(/opacity-25/);

    // 3. Edges along path are highlighted
    await expect(graphPage.getEdge('kd-1')).toHaveAttribute('data-highlighted', 'true');
    await expect(graphPage.getEdge('kd-2')).toHaveAttribute('data-highlighted', 'true');
  });

  test('slide-over inspector drawer opens with 5 functional tabs and copyable debug payload', async ({
    page,
  }) => {
    const selectedKc = {
      id: 'kc-2',
      projectId: mockProjectId,
      userId: mockUserId,
      slug: 'matrix-multiplication',
      name: 'Matrix Multiplication',
      pacerCategory: 'procedural',
      bloomLevel: 3,
      aliases: ['Matrix Product', 'Matrix Composition'],
      embedding: [0.05, -0.12, 0.33],
      sourceMaterialId: 'mat-1',
      status: 'active',
      createdAt: '2026-09-01T10:00:00.000Z',
      updatedAt: '2026-09-02T14:30:00.000Z',
    };

    const graphData = {
      components: [
        {
          id: 'kc-1',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'vector-spaces',
          name: 'Vector Spaces',
          pacerCategory: 'conceptual',
          bloomLevel: 2,
          sourceMaterialId: 'mat-1',
        },
        selectedKc,
        {
          id: 'kc-3',
          projectId: mockProjectId,
          userId: mockUserId,
          slug: 'eigenvalues',
          name: 'Eigenvalues & Eigenvectors',
          pacerCategory: 'procedural',
          bloomLevel: 4,
          sourceMaterialId: 'mat-1',
        },
      ],
      dependencies: [
        {
          id: 'kd-1',
          projectId: mockProjectId,
          sourceKcId: 'kc-1',
          targetKcId: 'kc-2',
          relationshipType: 'prerequisite',
          reasoning:
            'Vector space operations form the theoretical foundation for matrix representations.',
        },
        {
          id: 'kd-2',
          projectId: mockProjectId,
          sourceKcId: 'kc-2',
          targetKcId: 'kc-3',
          relationshipType: 'prerequisite',
          reasoning: 'Computing eigenvalues requires matrix-vector multiplication.',
        },
      ],
      materials: [
        {
          id: 'mat-1',
          projectId: mockProjectId,
          userId: mockUserId,
          title: 'Linear Algebra and Its Applications',
          filename: 'linear_algebra.pdf',
          fileType: 'application/pdf',
          fileSize: 1048576,
          status: 'ready',
          metadata: { graphExtraction: { status: 'ready', kcCount: 3 } },
        },
      ],
      diagnostics: {
        totalComponents: 3,
        nodeCount: 3,
        totalDependencies: 2,
        edgeCount: 2,
        orphanCount: 0,
        hasCycles: false,
        cyclePaths: [],
        pacerDistribution: {
          conceptual: 1,
          procedural: 2,
          analogous: 0,
          evidence: 0,
          reference: 0,
        },
        bloomDistribution: { 1: 0, 2: 1, 3: 1, 4: 1, 5: 0, 6: 0 },
      },
    };

    const inspectionData = {
      component: selectedKc,
      exercises: [
        {
          id: 'ex-1',
          projectId: mockProjectId,
          userId: mockUserId,
          materialId: 'mat-1',
          kcId: 'kc-2',
          pageNumber: 42,
          title: 'Compute 2x2 Matrix Product',
          prompt: 'Given matrices A = [[1, 2], [3, 4]] and B = [[2, 0], [1, 2]], compute AB.',
          solution: 'AB = [[4, 4], [10, 8]].',
          questionType: 'calculation',
          difficulty: 2,
        },
      ],
      chunks: [
        {
          id: 'chk-1',
          projectId: mockProjectId,
          userId: mockUserId,
          materialId: 'mat-1',
          chunkIndex: 5,
          content:
            'The product of two matrices A and B is defined if and only if the number of columns in A equals the number of rows in B.',
          metadata: { pageNumber: 42 },
          tokenCount: 40,
        },
      ],
    };

    await page.route(new RegExp(`/api/projects/${mockProjectId}/graph$`), async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(graphData),
      });
    });

    await page.route(
      new RegExp(`/api/projects/${mockProjectId}/graph/components/kc-2$`),
      async (route) => {
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(inspectionData),
        });
      },
    );

    const graphPage = new KnowledgeGraphPage(page);
    await graphPage.goto(mockProjectId);

    // Click on node kc-2 to open drawer
    await graphPage.getNode('kc-2').click();

    // Verify Inspector Drawer opened
    await expect(graphPage.getInspectorDrawer()).toBeVisible();
    await expect(graphPage.getInspectorTitle()).toHaveText('Matrix Multiplication');
    await expect(graphPage.getInspectorPacerBadge()).toHaveText('Procedural');
    await expect(graphPage.getInspectorBloomBadge()).toContainText('L3 • Apply');

    // 1. Tab: Overview
    await expect(graphPage.getTabContent('overview')).toBeVisible();
    await expect(graphPage.getConceptSlug()).toHaveText('matrix-multiplication');
    await expect(graphPage.getConceptAliases()).toContainText('Matrix Product');

    // 2. Tab: Dependencies
    await graphPage.getTabTrigger('dependencies').click();
    await expect(graphPage.getTabContent('dependencies')).toBeVisible();
    await expect(graphPage.getDirectPrerequisitesList()).toContainText('Vector Spaces');
    await expect(graphPage.getUnlockedConceptsList()).toContainText('Eigenvalues & Eigenvectors');
    await expect(graphPage.getDependencyReasoning().first()).toContainText(
      'Vector space operations form the theoretical foundation',
    );

    // 3. Tab: Exercises
    await graphPage.getTabTrigger('exercises').click();
    await expect(graphPage.getTabContent('exercises')).toBeVisible();
    await expect(graphPage.getGroundedExercisesList()).toBeVisible();
    await expect(graphPage.getExerciseType()).toContainText('calculation');
    await expect(graphPage.getExercisePage()).toContainText('Page 42');
    await expect(graphPage.getExerciseDifficulty()).toContainText('Difficulty 2');
    await expect(graphPage.getExercisePrompt()).toContainText(
      'Given matrices A = [[1, 2], [3, 4]]',
    );
    await expect(graphPage.getExerciseSolution()).toContainText('AB = [[4, 4], [10, 8]]');

    // 4. Tab: Source Attribution
    await graphPage.getTabTrigger('source').click();
    await expect(graphPage.getTabContent('source')).toBeVisible();
    await expect(graphPage.getSourceMaterialName()).toHaveText(
      'Linear Algebra and Its Applications',
    );
    await expect(graphPage.getSourceMaterialLink()).toBeVisible();
    await expect(graphPage.getSourceChunksList()).toContainText('Chunk #6');
    await expect(graphPage.getSourceChunksList()).toContainText('Page 42');
    await expect(graphPage.getSourceChunksList()).toContainText(
      'The product of two matrices A and B is defined',
    );

    // 5. Tab: Debug / Raw Data
    await graphPage.getTabTrigger('debug').click();
    await expect(graphPage.getTabContent('debug')).toBeVisible();
    await expect(graphPage.getEmbeddingDiagnostics()).toContainText('768 dimensions');
    await expect(graphPage.getRawJsonPayload()).toBeVisible();

    // Test Copy JSON button
    const copyBtn = graphPage.getCopyJsonButton();
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(graphPage.getCopyJsonSuccess()).toBeVisible();
    await expect(graphPage.getCopyJsonSuccess()).toHaveText('Copied!');

    // Close Drawer
    await graphPage.getInspectorCloseButton().click();
    await expect(graphPage.getInspectorDrawer()).not.toBeVisible();
  });
});
