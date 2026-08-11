import { test as baseTest } from '@playwright/test';
import { AuthPage } from './pages/auth';

export type TestFixtures = {
  authPage: AuthPage;
};

export const test = baseTest.extend<TestFixtures>({
  authPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    await use(authPage);
  },
});

export { expect } from '@playwright/test';
