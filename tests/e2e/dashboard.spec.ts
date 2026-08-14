import { expect, test } from '@playwright/test';
import { DashboardPage } from '../pages/dashboard';

test.describe('Unified Dashboard & Routing E2E', () => {
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

  test.describe('Authenticated Dashboard Operations', () => {
    test.beforeEach(async ({ page }) => {
      await page.context().addCookies([
        {
          name: 'sb-mock-auth',
          value: JSON.stringify({
            email: 'dashboard-user@example.com',
            // biome-ignore lint/style/useNamingConvention: Supabase metadata key
            user_metadata: { full_name: 'Dashboard User' },
          }),
          domain: 'localhost',
          path: '/',
        },
      ]);
    });

    test('authenticated visit to / displays unified Dashboard with welcome banner and Go to AI Chat CTA', async ({
      page,
    }) => {
      const dashboardPage = new DashboardPage(page);
      await dashboardPage.goto();

      await expect(dashboardPage.getDashboardHeading()).toHaveText('Dashboard');
      await expect(dashboardPage.getWelcomeMessage()).toContainText('Dashboard User');
      await expect(dashboardPage.getGoToChatButton()).toBeVisible();
      await expect(dashboardPage.getHeaderChatLink()).toBeVisible();

      // Click "Go to AI Chat" CTA button
      await dashboardPage.getGoToChatButton().click();
      await expect(page).toHaveURL(/\/chat$/);
    });

    test('authenticated user accessing /login is redirected back to root / dashboard by proxy guard', async ({
      page,
    }) => {
      await page.goto('/login');
      await expect(page).toHaveURL(new RegExp(`${page.url().split('/login')[0]}/?$`, 'i'));
    });
  });
});
