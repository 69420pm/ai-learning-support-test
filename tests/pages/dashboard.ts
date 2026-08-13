import type { Page } from '@playwright/test';

export class DashboardPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/');
  }

  getDashboardHeading() {
    return this.page.getByTestId('dashboard-heading');
  }

  getWelcomeMessage() {
    return this.page.getByTestId('dashboard-welcome');
  }

  getGoToChatButton() {
    return this.page.getByRole('link', { name: /Go to AI Chat/i });
  }

  getSignInButton() {
    return this.page.getByRole('banner').getByRole('link', { name: 'Sign In' });
  }

  getSignUpButton() {
    return this.page.getByRole('banner').getByRole('link', { name: 'Sign Up' });
  }

  getHeaderChatLink() {
    return this.page.getByRole('banner').getByRole('link', { name: 'Chat' });
  }

  getPublicLandingTitle() {
    return this.page.getByRole('heading', { name: /Document-Grounded Active Learning/i });
  }
}
