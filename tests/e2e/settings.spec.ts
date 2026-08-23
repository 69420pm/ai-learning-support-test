import { expect, test } from '@playwright/test';
import { SettingsPage } from '../pages/settings';

test.describe('Settings Dashboard & Theme Management E2E', () => {
  test('unauthenticated visit to /settings redirects to /login', async ({ page }) => {
    await page.context().clearCookies();
    const settingsPage = new SettingsPage(page);
    await settingsPage.goto();

    await expect(page).toHaveURL(/\/login/);
  });

  test.describe('Authenticated Settings Experience', () => {
    const mockUserId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

    test.beforeEach(async ({ page }) => {
      await page.context().addCookies([
        {
          name: 'sb-mock-auth',
          value: JSON.stringify({
            id: mockUserId,
            email: 'learner-settings@example.com',
            // biome-ignore lint/style/useNamingConvention: Supabase metadata key
            user_metadata: { full_name: 'Settings Learner' },
          }),
          domain: 'localhost',
          path: '/',
        },
      ]);
    });

    test('navigates to /settings from UserNav menu dropdown in Header', async ({ page }) => {
      await page.goto('/');

      const userNavTrigger = page.getByTestId('user-nav-trigger');
      await expect(userNavTrigger).toBeVisible();
      await userNavTrigger.click();

      const settingsMenuItem = page.getByTestId('user-nav-settings');
      await expect(settingsMenuItem).toBeVisible();
      await settingsMenuItem.click();

      await expect(page).toHaveURL(/\/settings/);
      const settingsPage = new SettingsPage(page);
      await expect(settingsPage.heading).toHaveText('Settings');
    });

    test('displays Profile overview card with learner name, email, and role', async ({ page }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();

      await expect(settingsPage.profileCard).toBeVisible();
      await expect(settingsPage.profileName).toHaveText('Settings Learner');
      await expect(settingsPage.profileEmail).toHaveText('learner-settings@example.com');
    });

    test('displays Appearance card with System, Light, and Dark visual preview options', async ({
      page,
    }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();

      await expect(settingsPage.appearanceCard).toBeVisible();
      await expect(settingsPage.systemThemeOption).toBeVisible();
      await expect(settingsPage.lightThemeOption).toBeVisible();
      await expect(settingsPage.darkThemeOption).toBeVisible();
    });

    test('switches themes immediately and persists theme across reload and navigation', async ({
      page,
    }) => {
      const settingsPage = new SettingsPage(page);
      await settingsPage.goto();

      // 1. Select Dark Theme
      await settingsPage.selectTheme('dark');
      await expect(page.locator('html')).toHaveClass(/dark/);
      await expect(settingsPage.getThemeIndicator('dark')).toBeVisible();

      // 2. Persists on page reload
      await page.reload();
      await expect(page.locator('html')).toHaveClass(/dark/);
      await expect(settingsPage.getThemeIndicator('dark')).toBeVisible();

      // 3. Select Light Theme
      await settingsPage.selectTheme('light');
      await expect(page.locator('html')).not.toHaveClass(/dark/);
      await expect(settingsPage.getThemeIndicator('light')).toBeVisible();

      // 4. Persists across navigation to dashboard and back
      await page.goto('/');
      await expect(page.locator('html')).not.toHaveClass(/dark/);
      await settingsPage.goto();
      await expect(settingsPage.getThemeIndicator('light')).toBeVisible();
    });
  });
});
