import { expect, test } from '@playwright/test';
import { MaterialsWorkbenchPage } from '../pages/materials-workbench';

test.describe('Dedicated Materials Management & Ingestion Workbench E2E', () => {
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

  test('renders full-page workbench table with search filtering and sorting', async ({ page }) => {
    const materialsData = [
      {
        id: 'mat-1',
        projectId: mockProjectId,
        userId: mockUserId,
        title: 'Alpha Mathematics Fundamentals',
        filename: 'alpha_math.pdf',
        fileType: 'application/pdf',
        fileSize: 4096,
        status: 'ready',
        metadata: {
          chunkCount: 10,
          tokenCount: 2500,
          graphExtraction: { status: 'ready', kcCount: 6, exerciseCount: 3 },
        },
        createdAt: '2026-08-20T10:00:00.000Z',
      },
      {
        id: 'mat-2',
        projectId: mockProjectId,
        userId: mockUserId,
        title: 'Beta Chemistry Reaction Notes',
        filename: 'beta_chem.md',
        fileType: 'text/markdown',
        fileSize: 2048,
        status: 'processing',
        metadata: {
          progress: { stage: 'chunking', stagePercent: 60 },
        },
        createdAt: '2026-08-21T10:00:00.000Z',
      },
      {
        id: 'mat-3',
        projectId: mockProjectId,
        userId: mockUserId,
        title: 'Gamma Quantum Mechanics',
        filename: 'gamma_qm.pdf',
        fileType: 'application/pdf',
        fileSize: 1024,
        status: 'failed',
        errorMessage: 'Invalid PDF syntax',
        createdAt: '2026-08-22T10:00:00.000Z',
      },
    ];

    await page.route(new RegExp(`/api/projects/${mockProjectId}/materials`), async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ materials: materialsData }),
      });
    });

    const workbenchPage = new MaterialsWorkbenchPage(page);
    await workbenchPage.goto(mockProjectId);

    // 1. Verify full-page workbench container and header
    await expect(workbenchPage.getWorkbench()).toBeVisible();
    await expect(workbenchPage.getWorkbenchHeading()).toBeVisible();

    // 2. Verify all materials rendered in table
    await expect(page.getByText('Alpha Mathematics Fundamentals')).toBeVisible();
    await expect(page.getByText('Beta Chemistry Reaction Notes')).toBeVisible();
    await expect(page.getByText('Gamma Quantum Mechanics')).toBeVisible();

    // 3. Test Search filtering
    const searchInput = workbenchPage.getSearchInput();
    await searchInput.fill('Chemistry');
    await expect(page.getByText('Beta Chemistry Reaction Notes')).toBeVisible();
    await expect(page.getByText('Alpha Mathematics Fundamentals')).not.toBeVisible();
    await expect(page.getByText('Gamma Quantum Mechanics')).not.toBeVisible();

    // Clear search
    await searchInput.fill('');
    await expect(page.getByText('Alpha Mathematics Fundamentals')).toBeVisible();
    await expect(page.getByText('Gamma Quantum Mechanics')).toBeVisible();

    // 4. Test Status filtering
    const statusSelect = workbenchPage.getStatusFilter();
    await statusSelect.selectOption('ready');
    await expect(page.getByText('Alpha Mathematics Fundamentals')).toBeVisible();
    await expect(page.getByText('Beta Chemistry Reaction Notes')).not.toBeVisible();
    await expect(page.getByText('Gamma Quantum Mechanics')).not.toBeVisible();

    await statusSelect.selectOption('failed');
    await expect(page.getByText('Gamma Quantum Mechanics')).toBeVisible();
    await expect(page.getByText('Alpha Mathematics Fundamentals')).not.toBeVisible();

    await statusSelect.selectOption('all');
    await expect(page.getByText('Alpha Mathematics Fundamentals')).toBeVisible();
    await expect(page.getByText('Beta Chemistry Reaction Notes')).toBeVisible();
    await expect(page.getByText('Gamma Quantum Mechanics')).toBeVisible();
  });

  test('displays granular ingestion progress with active stage and animated indicators', async ({
    page,
  }) => {
    const processingMaterial = {
      id: 'mat-raster',
      projectId: mockProjectId,
      userId: mockUserId,
      title: 'Advanced Robotics Textbook',
      filename: 'robotics.pdf',
      fileType: 'application/pdf',
      fileSize: 8192,
      status: 'processing',
      metadata: {
        progress: {
          stage: 'rasterizing',
          stagePercent: 50,
          currentPage: 2,
          totalPages: 4,
        },
      },
      createdAt: new Date().toISOString(),
    };

    await page.route(new RegExp(`/api/projects/${mockProjectId}/materials`), async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ materials: [processingMaterial] }),
      });
    });

    const workbenchPage = new MaterialsWorkbenchPage(page);
    await workbenchPage.goto(mockProjectId);

    // Verify stage label and page feedback
    await expect(workbenchPage.getIngestionStage(processingMaterial.id)).toBeVisible();
    await expect(page.getByText('Rasterizing')).toBeVisible();
    await expect(page.getByText('Page 2 of 4')).toBeVisible();
    await expect(page.getByText('(50%)')).toBeVisible();
  });

  test('renders prominent unclipped action buttons and triggers concept extraction & sync graph', async ({
    page,
  }) => {
    let syncGraphTriggered = false;
    let singleExtractTriggered = false;

    const readyMaterial = {
      id: 'mat-ready-1',
      projectId: mockProjectId,
      userId: mockUserId,
      title: 'Graph Theory & Networks',
      filename: 'graph_theory.pdf',
      fileType: 'application/pdf',
      fileSize: 4096,
      status: 'ready',
      metadata: {
        chunkCount: 8,
        tokenCount: 1600,
        graphExtraction: { status: 'not_started' },
      },
      createdAt: new Date().toISOString(),
    };

    await page.route(new RegExp(`/api/projects/${mockProjectId}/materials`), async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ materials: [readyMaterial] }),
      });
    });

    await page.route(`**/api/projects/${mockProjectId}/graph/extract*`, async (route) => {
      const payload = route.request().postDataJSON() || {};
      if (payload.materialIds?.length) {
        singleExtractTriggered = true;
      } else {
        syncGraphTriggered = true;
      }
      await route.fulfill({
        status: 202,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ queued: true, jobIds: ['job-1'] }),
      });
    });

    const workbenchPage = new MaterialsWorkbenchPage(page);
    await workbenchPage.goto(mockProjectId);

    // 1. Verify header buttons are prominent and unclipped
    const uploadBtn = workbenchPage.getUploadButton();
    const syncGraphBtn = workbenchPage.getSyncGraphButton();
    await expect(uploadBtn).toBeVisible();
    await expect(syncGraphBtn).toBeVisible();

    // 2. Verify row action buttons are prominent and unclipped
    const inspectBtn = workbenchPage.getInspectButton(readyMaterial.id);
    const extractBtn = workbenchPage.getExtractButton(readyMaterial.id);
    const deleteBtn = workbenchPage.getDeleteButton(readyMaterial.id);
    await expect(inspectBtn).toBeVisible();
    await expect(extractBtn).toBeVisible();
    await expect(deleteBtn).toBeVisible();

    // 3. Test project-wide Sync Graph button
    await syncGraphBtn.click();
    expect(syncGraphTriggered).toBe(true);

    // 4. Test per-row Extract Concepts button
    await extractBtn.click();
    expect(singleExtractTriggered).toBe(true);
  });

  test('drag-and-drop zone uploads multiple materials with instant queue status feedback', async ({
    page,
  }) => {
    let uploadCount = 0;

    await page.route(new RegExp(`/api/projects/${mockProjectId}/materials`), async (route) => {
      if (route.request().method() === 'POST') {
        uploadCount += 1;
        await route.fulfill({
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            material: {
              id: `mat-new-${uploadCount}`,
              projectId: mockProjectId,
              userId: mockUserId,
              title: `Doc ${uploadCount}`,
              filename: `doc_${uploadCount}.pdf`,
              fileType: 'application/pdf',
              status: 'pending',
              createdAt: new Date().toISOString(),
            },
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ materials: [] }),
      });
    });

    const workbenchPage = new MaterialsWorkbenchPage(page);
    await workbenchPage.goto(mockProjectId);

    // 1. Verify drop zone exists
    const dropzone = workbenchPage.getDropzone();
    await expect(dropzone).toBeVisible();
    await expect(page.getByText('Drag & drop materials here, or click to browse')).toBeVisible();

    // 2. Select files via hidden file input on the workbench
    const fileInput = workbenchPage.getFileInput();
    await fileInput.setInputFiles([
      {
        name: 'lecture_slides.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 Mock Slides'),
      },
      {
        name: 'reading_summary.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Summary\nKey points'),
      },
    ]);

    // 3. Verify instant queue feedback renders
    await expect(workbenchPage.getUploadQueue()).toBeVisible();
    await expect(page.getByText('lecture_slides.pdf')).toBeVisible();
    await expect(page.getByText('reading_summary.md')).toBeVisible();

    // Wait for upload requests to complete
    await expect(page.getByText('Ready').first()).toBeVisible({ timeout: 5000 });
    expect(uploadCount).toBe(2);
  });

  test('chunk inspection dialog opens and renders extracted content and indexed chunks', async ({
    page,
  }) => {
    const inspectedMaterial = {
      id: 'mat-inspect-e2e',
      projectId: mockProjectId,
      userId: mockUserId,
      title: 'Machine Learning Overview',
      filename: 'ml_overview.pdf',
      fileType: 'application/pdf',
      fileSize: 4096,
      status: 'ready',
      metadata: { chunkCount: 2, tokenCount: 400, pageCount: 2 },
      createdAt: '2026-08-20T12:00:00.000Z',
    };

    const chunks = [
      {
        id: 'chunk-1',
        materialId: inspectedMaterial.id,
        projectId: mockProjectId,
        userId: mockUserId,
        chunkIndex: 0,
        content:
          '# Supervised Learning\nSupervised learning infers a function from labeled training data.',
        tokenCount: 200,
        metadata: { pageNumber: 1 },
        createdAt: '2026-08-20T12:01:00.000Z',
      },
      {
        id: 'chunk-2',
        materialId: inspectedMaterial.id,
        projectId: mockProjectId,
        userId: mockUserId,
        chunkIndex: 1,
        content:
          '# Unsupervised Learning\nUnsupervised learning discovers hidden patterns in unlabeled data.',
        tokenCount: 200,
        metadata: { pageNumber: 2 },
        createdAt: '2026-08-20T12:01:02.000Z',
      },
    ];

    await page.route(new RegExp(`/api/projects/${mockProjectId}/materials`), async (route) => {
      const url = route.request().url();
      if (url.includes(inspectedMaterial.id)) {
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            material: inspectedMaterial,
            chunks,
            content: `${chunks[0].content}\n\n${chunks[1].content}`,
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ materials: [inspectedMaterial] }),
      });
    });

    const workbenchPage = new MaterialsWorkbenchPage(page);
    await workbenchPage.goto(mockProjectId);

    // Click "Inspect Chunks" button
    await workbenchPage.getInspectButton(inspectedMaterial.id).click();

    // Verify dialog opened
    await expect(workbenchPage.getMaterialPreviewDialog()).toBeVisible();
    await expect(workbenchPage.getTabExtractedContent()).toBeVisible();
    await expect(workbenchPage.getTabIndexedChunks()).toBeVisible();

    // Switch to indexed chunks tab
    await workbenchPage.getTabIndexedChunks().click();
    await expect(page.getByTestId('chunk-card-0')).toBeVisible();
    await expect(page.getByTestId('chunk-card-1')).toBeVisible();
  });

  test('cascade deletion confirmation dialog safely removes material and cascading chunks', async ({
    page,
  }) => {
    let materialDeleted = false;

    const targetMaterial = {
      id: 'mat-delete-target',
      projectId: mockProjectId,
      userId: mockUserId,
      title: 'Deprecated Lecture Slides',
      filename: 'old_slides.pdf',
      fileType: 'application/pdf',
      fileSize: 3072,
      status: 'ready',
      metadata: { chunkCount: 6 },
      createdAt: '2026-08-20T10:00:00.000Z',
    };

    await page.route(new RegExp(`/api/projects/${mockProjectId}/materials`), async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'DELETE' && url.includes(targetMaterial.id)) {
        materialDeleted = true;
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ success: true, materialId: targetMaterial.id }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          materials: materialDeleted ? [] : [targetMaterial],
        }),
      });
    });

    const workbenchPage = new MaterialsWorkbenchPage(page);
    await workbenchPage.goto(mockProjectId);

    await expect(page.getByText('Deprecated Lecture Slides')).toBeVisible();

    // Click Delete button on row
    await workbenchPage.getDeleteButton(targetMaterial.id).click();

    // Verify Cascade Deletion dialog is open
    await expect(workbenchPage.getDeleteMaterialDialog()).toBeVisible();
    await expect(page.getByText('Permanent Cascade Deletion Notice:')).toBeVisible();
    await expect(
      page.getByText(
        'Removes associated knowledge components, grounded exercises, and learner progress',
      ),
    ).toBeVisible();

    // Confirm deletion
    await workbenchPage.getConfirmDeleteButton().click();

    // Verify dialog closed and item removed
    await expect(workbenchPage.getDeleteMaterialDialog()).not.toBeVisible();
    await expect(page.getByText('Deprecated Lecture Slides')).not.toBeVisible();
    expect(materialDeleted).toBe(true);
  });
});
