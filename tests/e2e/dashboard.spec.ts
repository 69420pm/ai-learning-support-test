import { expect, type Route, test } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard';

type MockProject = {
  id: string;
  name: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  chatCount: number;
};

function handleGet(projectsState: MockProject[]) {
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ projects: projectsState }),
  };
}

function handlePost(projectsState: MockProject[], userId: string, id: string, name: string) {
  const newProj: MockProject = {
    id,
    name: name || 'New Project',
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    chatCount: 0,
  };
  projectsState.push(newProj);
  return {
    status: 201,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ project: newProj }),
  };
}

function handlePatch(projectsState: MockProject[], id: string, name: string) {
  const proj = projectsState.find((p) => p.id === id);
  if (proj && name) proj.name = name;
  return {
    status: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ project: proj || { id, name } }),
  };
}

function mockProjectsRoute(
  route: Route,
  projectsState: MockProject[],
  userId: string,
  p2Id: string,
) {
  const method = route.request().method();
  const url = new URL(route.request().url());
  const id = url.pathname.split('/').pop() || '';
  const body = JSON.parse(route.request().postData() || '{}');

  if (method === 'GET') {
    return route.fulfill(handleGet(projectsState));
  }
  if (method === 'POST') {
    return route.fulfill(handlePost(projectsState, userId, p2Id, body.name));
  }
  if (method === 'PATCH') {
    return route.fulfill(handlePatch(projectsState, id, body.name));
  }
  if (method === 'DELETE') {
    const remaining = projectsState.filter((p) => p.id !== id);
    projectsState.length = 0;
    projectsState.push(...remaining);
    return route.fulfill({
      status: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ success: true }),
    });
  }
  return route.continue();
}

test.describe('Projects Dashboard & Routing E2E', () => {
  test('unauthenticated visit to / displays public landing page with Sign In / Sign Up CTAs', async ({
    page,
  }) => {
    await page.context().clearCookies();
    const dashboardPage = new DashboardPage(page);
    await dashboardPage.goto();

    await expect(dashboardPage.getPublicLandingTitle()).toBeVisible();
    await expect(dashboardPage.getSignInButton()).toBeVisible();
    await expect(dashboardPage.getSignUpButton()).toBeVisible();
  });

  test.describe('Authenticated Projects Dashboard Operations', () => {
    const mockUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
    const mockP1Id = '11111111-1111-4111-a111-111111111111';
    const mockP2Id = '22222222-2222-4222-a222-222222222222';

    let projectsState: MockProject[] = [];

    test.beforeEach(async ({ page }) => {
      projectsState = [
        {
          id: mockP1Id,
          name: 'Linear Algebra',
          userId: mockUserId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          chatCount: 0,
        },
      ];

      await page.context().addCookies([
        {
          name: 'sb-mock-auth',
          value: JSON.stringify({
            id: mockUserId,
            email: 'dashboard-user@example.com',
            // biome-ignore lint/style/useNamingConvention: Supabase metadata key
            user_metadata: { full_name: 'Dashboard User' },
          }),
          domain: 'localhost',
          path: '/',
        },
      ]);

      await page.route(/\/api\/projects/, (route) =>
        mockProjectsRoute(route, projectsState, mockUserId, mockP2Id),
      );
    });

    test('authenticated visit to / displays Projects dashboard with project cards', async ({
      page,
    }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      await expect(dashboardPage.getDashboardHeading()).toHaveText('Projects');
      await expect(dashboardPage.getWelcomeMessage()).toContainText('Dashboard User');
      await expect(page.getByTestId(`project-card-${mockP1Id}`)).toBeVisible();
      await expect(page.getByTestId(`project-title-${mockP1Id}`)).toHaveText('Linear Algebra');
    });

    test('creates, renames, and deletes a project on dashboard', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      // Create new project
      await dashboardPage.createProject('Organic Chemistry');
      await expect(page.getByTestId(`project-title-${mockP2Id}`)).toHaveText('Organic Chemistry');

      // Rename project
      await dashboardPage.renameProject(mockP2Id, 'Advanced Chemistry');
      await expect(page.getByTestId(`project-title-${mockP2Id}`)).toHaveText('Advanced Chemistry');

      // Delete project
      await dashboardPage.deleteProject(mockP2Id);
      await expect(page.getByTestId(`project-card-${mockP2Id}`)).not.toBeVisible();
    });

    test('clicking project card navigates to project-scoped chat route', async ({ page }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      await page.getByTestId(`project-card-${mockP1Id}`).click();
      await expect(page).toHaveURL(new RegExp(`/projects/${mockP1Id}/chat`));
    });

    test('authenticated user accessing /login is redirected back to root / dashboard by proxy guard', async ({
      page,
    }) => {
      await page.goto('/login');
      await expect(page).toHaveURL(new RegExp(`${page.url().split('/login')[0]}/?$`, 'i'));
    });
  });
});
