import { expect, test } from '@/tests/fixtures';

test.describe('Deterministic High-Level Regression Safety Net E2E', () => {
  const mockUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const mockProjectId = '11111111-1111-4111-a111-111111111111';

  test.beforeEach(async ({ page, setupMockAuth }) => {
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await setupMockAuth({ id: mockUserId, email: 'test@example.com', fullName: 'Test User' });
  });

  test('executes end-to-end user journey: ingestion -> concept graph -> grounded chat', async ({
    page,
    dashboardPage,
    materialsWorkbenchPage,
    knowledgeGraphPage,
    chatPage,
  }) => {
    // 1. Mock Projects API
    await page.route('**/api/projects', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            projects: [
              {
                id: mockProjectId,
                name: 'Autonomous Systems & AI',
                userId: mockUserId,
                createdAt: '2026-08-20T10:00:00.000Z',
                updatedAt: '2026-08-20T10:00:00.000Z',
                chatCount: 2,
              },
            ],
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/api/projects/${mockProjectId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockProjectId,
          name: 'Autonomous Systems & AI',
          userId: mockUserId,
          createdAt: '2026-08-20T10:00:00.000Z',
          updatedAt: '2026-08-20T10:00:00.000Z',
        }),
      });
    });

    // 2. Mock Materials API with staged progress transition
    const mockMaterials = [
      {
        id: 'mat-regression-1',
        projectId: mockProjectId,
        userId: mockUserId,
        title: 'Deep Learning Foundations',
        filename: 'deep_learning.pdf',
        fileType: 'application/pdf',
        fileSize: 10240,
        status: 'ready',
        metadata: {
          chunkCount: 12,
          tokenCount: 3600,
          pageCount: 6,
          graphExtraction: {
            status: 'ready',
            kcCount: 4,
            exerciseCount: 2,
          },
        },
        createdAt: '2026-08-25T12:00:00.000Z',
      },
    ];

    await page.route(new RegExp(`/api/projects/${mockProjectId}/materials$`), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ materials: mockMaterials }),
      });
    });

    // Mock Material Inspector (single material details with chunks)
    await page.route(
      new RegExp(`/api/projects/${mockProjectId}/materials/mat-regression-1$`),
      async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            material: mockMaterials[0],
            chunks: [
              {
                id: 'chk-reg-1',
                materialId: 'mat-regression-1',
                projectId: mockProjectId,
                chunkIndex: 0,
                content:
                  'Neural networks are composed of layers of interconnected artificial neurons.',
                tokenCount: 15,
                metadata: { pageNumber: 1 },
              },
              {
                id: 'chk-reg-2',
                materialId: 'mat-regression-1',
                projectId: mockProjectId,
                chunkIndex: 1,
                content:
                  'Backpropagation computes the gradient of the loss function with respect to weights.',
                tokenCount: 18,
                metadata: { pageNumber: 2 },
              },
            ],
            content:
              'Neural networks are composed of layers of interconnected artificial neurons. Backpropagation computes the gradient of the loss function with respect to weights.',
          }),
        });
      },
    );

    // 3. Mock Knowledge Graph API
    await page.route(new RegExp(`/api/projects/${mockProjectId}/graph$`), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          components: [
            {
              id: 'kc-reg-1',
              projectId: mockProjectId,
              userId: mockUserId,
              name: 'Artificial Neurons',
              slug: 'artificial-neurons',
              pacerCategory: 'conceptual',
              bloomLevel: 2,
              orderIndex: 0,
              status: 'active',
            },
            {
              id: 'kc-reg-2',
              projectId: mockProjectId,
              userId: mockUserId,
              name: 'Activation Functions',
              slug: 'activation-functions',
              pacerCategory: 'procedural',
              bloomLevel: 3,
              orderIndex: 1,
              status: 'active',
            },
            {
              id: 'kc-reg-3',
              projectId: mockProjectId,
              userId: mockUserId,
              name: 'Backpropagation',
              slug: 'backpropagation',
              pacerCategory: 'procedural',
              bloomLevel: 4,
              orderIndex: 2,
              status: 'active',
            },
          ],
          dependencies: [
            {
              id: 'edge-reg-1',
              projectId: mockProjectId,
              sourceKcId: 'kc-reg-1',
              targetKcId: 'kc-reg-2',
              relationshipType: 'prerequisite',
            },
            {
              id: 'edge-reg-2',
              projectId: mockProjectId,
              sourceKcId: 'kc-reg-2',
              targetKcId: 'kc-reg-3',
              relationshipType: 'prerequisite',
            },
          ],
          materials: mockMaterials,
          diagnostics: {
            totalComponents: 3,
            nodeCount: 3,
            totalDependencies: 2,
            edgeCount: 2,
            orphanCount: 0,
            hasCycles: false,
            cyclePaths: [],
            pacerDistribution: {
              procedural: 2,
              conceptual: 1,
              analogous: 0,
              evidence: 0,
              reference: 0,
            },
            bloomDistribution: { 1: 0, 2: 1, 3: 1, 4: 1, 5: 0, 6: 0 },
          },
        }),
      });
    });

    // 4. Mock Chat Streaming API with grounded response
    await page.route('**/api/chat', async (route) => {
      const sseBody = [
        'event: message',
        'data: {"type":"text-start","id":"part-reg-1"}',
        '',
        'event: message',
        'data: {"type":"text-delta","id":"part-reg-1","delta":"Backpropagation is an optimization algorithm used to train neural networks by calculating gradients.\\n\\n```python\\n# Gradient descent step\\nw = w - learning_rate * dw\\n```\\n\\n**Citations:**\\n- *Deep Learning Foundations*, Page 2"}',
        '',
        'event: message',
        'data: {"type":"text-end","id":"part-reg-1"}',
        '',
        'event: message',
        'data: {"type":"finish","finishReason":"stop"}',
        '',
      ].join('\n');

      await route.fulfill({
        status: 200,
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'x-vercel-ai-ui-stream': 'v1',
        },
        body: sseBody,
      });
    });

    // -------------------------------------------------------------
    // STEP 1: Dashboard & Project Navigation
    // -------------------------------------------------------------
    await dashboardPage.goto();
    await expect(dashboardPage.getDashboardHeading()).toBeVisible();
    await expect(dashboardPage.getProjectTitle(mockProjectId)).toContainText(
      'Autonomous Systems & AI',
    );

    // -------------------------------------------------------------
    // STEP 2: Materials Workbench Ingestion & Inspection
    // -------------------------------------------------------------
    await materialsWorkbenchPage.goto(mockProjectId);
    await expect(materialsWorkbenchPage.getWorkbenchHeading()).toBeVisible();

    // Verify material listed with ready status badge
    const materialRow = materialsWorkbenchPage.getRow('mat-regression-1');
    await expect(materialRow).toBeVisible();
    await expect(materialRow).toContainText('Deep Learning Foundations');

    // Inspect material chunks
    await materialsWorkbenchPage.getInspectButton('mat-regression-1').click();
    await expect(materialsWorkbenchPage.getMaterialPreviewDialog()).toBeVisible();
    await materialsWorkbenchPage.getTabIndexedChunks().click();
    await expect(page.getByTestId('chunk-card-0')).toBeVisible();
    await expect(page.getByTestId('chunk-card-0')).toContainText(
      'interconnected artificial neurons',
    );
    await page.keyboard.press('Escape');

    // -------------------------------------------------------------
    // STEP 3: Knowledge Graph Canvas & Dual Layout Verification
    // -------------------------------------------------------------
    await knowledgeGraphPage.goto(mockProjectId);
    await expect(knowledgeGraphPage.getWorkbench()).toBeVisible();
    await expect(knowledgeGraphPage.getCanvas()).toBeVisible();

    // Verify extracted Knowledge Component nodes rendered
    await expect(knowledgeGraphPage.getNode('kc-reg-1')).toBeVisible();
    await expect(knowledgeGraphPage.getNodeName('kc-reg-1')).toContainText('Artificial Neurons');
    await expect(knowledgeGraphPage.getNode('kc-reg-2')).toBeVisible();
    await expect(knowledgeGraphPage.getNode('kc-reg-3')).toBeVisible();

    // Verify layout toggles
    await knowledgeGraphPage.getLayoutToggle().click();
    await knowledgeGraphPage.getLayoutDagButton().click();
    await expect(knowledgeGraphPage.getNode('kc-reg-1')).toBeVisible();

    // -------------------------------------------------------------
    // STEP 4: Question Answering Chat Grounded in Materials
    // -------------------------------------------------------------
    await chatPage.goto(mockProjectId);
    await expect(chatPage.getInput()).toBeVisible();

    await chatPage.sendUserMessage('Explain how backpropagation works.');

    // Verify streaming completion with grounded content and syntax highlighting
    await expect(page.getByText('Backpropagation is an optimization algorithm')).toBeVisible({
      timeout: 10000,
    });
    await expect(page.locator('pre code')).toBeVisible();
    await expect(page.getByRole('emphasis')).toContainText('Deep Learning Foundations');
  });

  test('verifies error boundaries: handles 500 API errors gracefully in workbench and chat', async ({
    page,
    materialsWorkbenchPage,
    chatPage,
  }) => {
    // 1. Simulate Workbench 500 Error
    await page.route(`**/api/projects/${mockProjectId}/materials`, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database connection failed' }),
      });
    });

    await page.route(`**/api/projects/${mockProjectId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: mockProjectId,
          name: 'Error Handling Project',
          userId: mockUserId,
        }),
      });
    });

    await materialsWorkbenchPage.goto(mockProjectId);
    await expect(materialsWorkbenchPage.getWorkbenchHeading()).toBeVisible();

    // Verify the workbench does not crash and renders empty state or error indication
    await expect(page.locator('body')).not.toContainText('Application error');

    // 2. Simulate Chat API 500 Error Boundary
    await page.route('**/api/chat', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'AI provider service unavailable' }),
      });
    });

    await chatPage.goto(mockProjectId);
    await expect(chatPage.getInput()).toBeVisible();
    await chatPage.sendUserMessage('This should fail gracefully');

    // Verify application handles error without white-screen or uncaught exception
    await expect(page.locator('body')).not.toContainText(
      'Application error: a client-side exception',
    );
  });
});
