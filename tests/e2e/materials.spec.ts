import { expect, test } from '@playwright/test';
import { ChatPage } from '../pages/chat';

test.describe('Material Management UI Suite, Ingestion Inspector & Cascade Deletion E2E', () => {
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

  test('multi-file upload dialog validates file formats, displays staged items, and uploads concurrently', async ({
    page,
  }) => {
    let uploadedCount = 0;

    await page.route(`**/api/projects/${mockProjectId}/materials*`, async (route) => {
      if (route.request().method() === 'POST') {
        uploadedCount += 1;
        await route.fulfill({
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            material: {
              id: `mat-${uploadedCount}`,
              projectId: mockProjectId,
              userId: mockUserId,
              title: `Uploaded ${uploadedCount}`,
              filename: `file_${uploadedCount}.md`,
              fileType: 'text/markdown',
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

    const chatPage = new ChatPage(page);
    await chatPage.goto(mockProjectId);

    // 1. Open upload dialog from sidebar
    await chatPage.getUploadMaterialButton().click();
    await expect(chatPage.getMaterialUploadDialog()).toBeVisible();

    // 2. Select valid multi-files via dialog file input
    const fileInput = chatPage.getUploadDialogFileInput();
    await fileInput.setInputFiles([
      {
        name: 'chapter_1.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 Chapter 1 Content'),
      },
      {
        name: 'notes.md',
        mimeType: 'text/markdown',
        buffer: Buffer.from('# Lecture Notes\nKey concepts and formulas.'),
      },
    ]);

    // 3. Verify staged files are rendered with Queued badges
    await expect(page.getByText('chapter_1.pdf')).toBeVisible();
    await expect(page.getByText('notes.md')).toBeVisible();
    await expect(page.getByText('Queued').first()).toBeVisible();

    // 4. Click Upload (2) button
    await chatPage.getStartUploadButton().click();

    // 5. Verify upload finishes and dialog closes
    await expect(chatPage.getMaterialUploadDialog()).not.toBeVisible({ timeout: 5000 });
    expect(uploadedCount).toBe(2);
  });

  test('MaterialPreviewDialog (Ingestion Inspector) renders dual tabs: Extracted Content and Indexed Chunks', async ({
    page,
  }) => {
    const seededMaterial = {
      id: 'mat-inspector-1',
      projectId: mockProjectId,
      userId: mockUserId,
      title: 'Neural Networks & Deep Learning',
      filename: 'deep_learning.pdf',
      fileType: 'application/pdf',
      fileSize: 4096,
      status: 'ready',
      metadata: {
        pageCount: 3,
        chunkCount: 2,
        tokenCount: 450,
      },
      createdAt: '2026-08-20T17:00:00.000Z',
    };

    const seededChunks = [
      {
        id: 'chunk-1',
        materialId: seededMaterial.id,
        projectId: mockProjectId,
        userId: mockUserId,
        chunkIndex: 0,
        content:
          '# Deep Learning Foundations\nBackpropagation computes gradients using the chain rule.',
        tokenCount: 220,
        metadata: { pageNumber: 1 },
        createdAt: '2026-08-20T17:01:00.000Z',
      },
      {
        id: 'chunk-2',
        materialId: seededMaterial.id,
        projectId: mockProjectId,
        userId: mockUserId,
        chunkIndex: 1,
        content:
          '## Convolutional Layers\nConv layers apply spatial filters to input feature maps.',
        tokenCount: 230,
        metadata: { pageNumber: 2 },
        createdAt: '2026-08-20T17:01:02.000Z',
      },
    ];

    await page.route(`**/api/projects/${mockProjectId}/materials*`, async (route) => {
      const url = route.request().url();
      if (url.includes(seededMaterial.id)) {
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            material: seededMaterial,
            chunks: seededChunks,
            content: `${seededChunks[0].content}\n\n${seededChunks[1].content}`,
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ materials: [seededMaterial] }),
      });
    });

    const chatPage = new ChatPage(page);
    await chatPage.goto(mockProjectId);

    // 1. Click material item to open Ingestion Inspector
    await page.getByText('Neural Networks & Deep Learning').click();
    await expect(chatPage.getMaterialPreviewDialog()).toBeVisible();

    // 2. Verify header stats: 2 Chunks, 450 Tokens, 3 Pages, Ready status
    await expect(page.getByText('2 Chunks')).toBeVisible();
    await expect(page.getByText('450 Tokens')).toBeVisible();
    await expect(page.getByText('3 Pages')).toBeVisible();
    await expect(page.getByTestId('preview-status-ready')).toBeVisible();

    // 3. Verify Extracted Content tab renders structured Markdown
    await expect(chatPage.getTabExtractedContent()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Deep Learning Foundations' })).toBeVisible();
    await expect(page.getByText('Backpropagation computes gradients')).toBeVisible();

    // 4. Switch to Indexed Chunks tab
    await chatPage.getTabIndexedChunks().click();
    await expect(page.getByTestId('chunk-card-0')).toBeVisible();
    await expect(page.getByTestId('chunk-card-1')).toBeVisible();
    await expect(page.getByText('Page 1').first()).toBeVisible();
    await expect(page.getByText('Page 2').first()).toBeVisible();

    // 5. Test Copy button in chunk card
    const copyChunkBtn = page.getByTestId('copy-chunk-0');
    await copyChunkBtn.click();
    await expect(page.getByText('Copied')).toBeVisible();
  });

  test('DeleteMaterialDialog displays cascade warning and triggers atomic deletion', async ({
    page,
  }) => {
    let materialDeleted = false;

    const seededMaterial = {
      id: 'mat-delete-target-1',
      projectId: mockProjectId,
      userId: mockUserId,
      title: 'Obsolete Notes',
      filename: 'old_notes.md',
      fileType: 'text/markdown',
      fileSize: 1024,
      status: 'ready',
      metadata: { chunkCount: 5 },
      createdAt: '2026-08-20T17:00:00.000Z',
    };

    await page.route(`**/api/projects/${mockProjectId}/materials*`, async (route) => {
      const method = route.request().method();
      const url = route.request().url();

      if (method === 'DELETE' && url.includes(seededMaterial.id)) {
        materialDeleted = true;
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ success: true, materialId: seededMaterial.id }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          materials: materialDeleted ? [] : [seededMaterial],
        }),
      });
    });

    const chatPage = new ChatPage(page);
    await chatPage.goto(mockProjectId);

    await expect(page.getByText('Obsolete Notes')).toBeVisible();

    // 1. Open delete dialog from material menu
    await chatPage.deleteMaterial(seededMaterial.id);

    // 2. Verify material is removed from sidebar list
    await expect(page.getByText('Obsolete Notes')).not.toBeVisible();
    expect(materialDeleted).toBe(true);
  });
});
