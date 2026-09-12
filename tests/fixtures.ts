import { test as baseTest, type Page } from '@playwright/test';
import { AuthPage } from './pages/auth';
import { ChatPage } from './pages/chat';
import { DashboardPage } from './pages/dashboard';
import { KnowledgeGraphPage } from './pages/knowledge-graph';
import { MaterialsWorkbenchPage } from './pages/materials-workbench';
import { SettingsPage } from './pages/settings';

export type TestFixtures = {
  authPage: AuthPage;
  chatPage: ChatPage;
  dashboardPage: DashboardPage;
  knowledgeGraphPage: KnowledgeGraphPage;
  materialsWorkbenchPage: MaterialsWorkbenchPage;
  settingsPage: SettingsPage;
  setupMockAuth: (user?: { id?: string; email?: string; fullName?: string }) => Promise<void>;
};

export const DEFAULT_MOCK_USER = {
  id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  email: 'test@example.com',
  fullName: 'Test User',
};

export async function setMockAuthCookie(
  page: Page,
  user: { id?: string; email?: string; fullName?: string } = {},
): Promise<void> {
  const mergedUser = {
    id: user.id ?? DEFAULT_MOCK_USER.id,
    email: user.email ?? DEFAULT_MOCK_USER.email,
    fullName: user.fullName ?? DEFAULT_MOCK_USER.fullName,
  };

  await page.context().addCookies([
    {
      name: 'sb-mock-auth',
      value: JSON.stringify({
        id: mergedUser.id,
        email: mergedUser.email,
        // biome-ignore lint/style/useNamingConvention: Supabase session schema requires snake_case
        user_metadata: { full_name: mergedUser.fullName },
      }),
      domain: 'localhost',
      path: '/',
    },
  ]);
}

export const test = baseTest.extend<TestFixtures>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },
  chatPage: async ({ page }, use) => {
    await use(new ChatPage(page));
  },
  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },
  knowledgeGraphPage: async ({ page }, use) => {
    await use(new KnowledgeGraphPage(page));
  },
  materialsWorkbenchPage: async ({ page }, use) => {
    await use(new MaterialsWorkbenchPage(page));
  },
  settingsPage: async ({ page }, use) => {
    await use(new SettingsPage(page));
  },
  setupMockAuth: async ({ page }, use) => {
    await use(async (user) => {
      await setMockAuthCookie(page, user);
    });
  },
});

export { expect } from '@playwright/test';
