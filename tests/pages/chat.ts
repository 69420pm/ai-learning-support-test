import type { Page } from '@playwright/test';

export class ChatPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/chat');
  }

  getChatHeader() {
    return this.page.getByRole('banner');
  }

  getChatTitle() {
    return this.page.getByRole('heading', { level: 1 });
  }

  getInput() {
    return this.page.getByPlaceholder('Ask AI Learning Support...');
  }

  getSendButton() {
    return this.page.getByRole('button', { name: 'Send message' });
  }

  getStopButton() {
    return this.page.getByRole('button', { name: 'Stop generation' });
  }

  getNewChatButton() {
    return this.page
      .getByRole('button', { name: 'New Chat' })
      .or(this.page.getByRole('link', { name: 'New Chat' }));
  }

  getScrollToBottomButton() {
    return this.page.getByRole('button', { name: 'Scroll to bottom' });
  }

  async sendUserMessage(message: string) {
    await this.getInput().fill(message);
    await this.getSendButton().click();
  }
}
