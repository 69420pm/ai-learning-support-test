import { expect, test } from '@playwright/test';
import { ChatPage } from '../pages/chat';

test.describe('Workspace Navigation Shell & Streamlined Chat Sidebar E2E', () => {
  const mockUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const mockProjectId = '11111111-1111-4111-a111-111111111111';

  test.beforeEach(async ({ page }) => {
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

    await page.route(`**/api/projects/${mockProjectId}/materials*`, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          materials: [
            {
              id: 'mat-1',
              projectId: mockProjectId,
              userId: mockUserId,
              title: 'Linear Algebra Chapter 1',
              filename: 'ch1.pdf',
              fileType: 'application/pdf',
              status: 'ready',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'mat-2',
              projectId: mockProjectId,
              userId: mockUserId,
              title: 'Organic Chemistry Lecture Notes and Synthesis Problems',
              filename: 'notes.md',
              fileType: 'text/markdown',
              status: 'processing',
              metadata: { progress: { stage: 'chunking' } },
              createdAt: new Date().toISOString(),
            },
          ],
        }),
      });
    });
  });

  test('persistent top navigation bar renders with tabs and switches views', async ({ page }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto(mockProjectId);

    // 1. Verify project nav exists and Chat tab is active
    await expect(chatPage.getProjectNav()).toBeVisible();
    await expect(chatPage.getProjectNavChat()).toHaveAttribute('aria-selected', 'true');
    await expect(chatPage.getProjectNavGraph()).toHaveAttribute('aria-selected', 'false');
    await expect(chatPage.getProjectNavMaterials()).toHaveAttribute('aria-selected', 'false');

    // 2. Click Knowledge Graph tab
    await chatPage.getProjectNavGraph().click();
    await expect(page).toHaveURL(`/projects/${mockProjectId}/graph`);
    await expect(page.getByTestId('project-graph-page')).toBeVisible();
    await expect(chatPage.getProjectNavGraph()).toHaveAttribute('aria-selected', 'true');
    await expect(chatPage.getProjectNavChat()).toHaveAttribute('aria-selected', 'false');

    // 3. Click Materials tab
    await chatPage.getProjectNavMaterials().click();
    await expect(page).toHaveURL(`/projects/${mockProjectId}/materials`);
    await expect(page.getByTestId('project-materials-page')).toBeVisible();
    await expect(chatPage.getProjectNavMaterials()).toHaveAttribute('aria-selected', 'true');

    // 4. Click Chat tab to return
    await chatPage.getProjectNavChat().click();
    await expect(page).toHaveURL(`/projects/${mockProjectId}/chat`);
    await expect(chatPage.getProjectNavChat()).toHaveAttribute('aria-selected', 'true');
  });

  test('chat sidebar renders streamlined material list without cramped sync button', async ({
    page,
  }) => {
    const chatPage = new ChatPage(page);
    await chatPage.goto(mockProjectId);

    // 1. Sidebar is visible
    await expect(chatPage.getSidebar()).toBeVisible();

    // 2. Cramped sync button is removed from header
    await expect(page.getByTestId('sync-graph-button')).not.toBeVisible();

    // 3. Status dots are rendered cleanly
    await expect(page.getByTestId('material-status-ready')).toBeVisible();
    await expect(page.getByTestId('material-status-processing')).toBeVisible();

    // 4. Sidebar navigation links to Knowledge Graph and Materials exist and work
    await expect(chatPage.getSidebarNavGraph()).toBeVisible();
    await expect(chatPage.getSidebarNavMaterials()).toBeVisible();

    await chatPage.getSidebarNavGraph().click();
    await expect(page).toHaveURL(`/projects/${mockProjectId}/graph`);

    // Return to chat
    await chatPage.getProjectNavChat().click();
    await expect(page).toHaveURL(`/projects/${mockProjectId}/chat`);

    await chatPage.getSidebarNavMaterials().click();
    await expect(page).toHaveURL(`/projects/${mockProjectId}/materials`);
  });
});
