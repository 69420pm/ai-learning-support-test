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
    return this.page.getByTestId('new-chat-button');
  }

  getModelSelectorTrigger() {
    return this.page.getByTestId('model-selector-trigger');
  }

  getModelOption(modelId: string) {
    return this.page.getByTestId(`model-option-${modelId}`);
  }

  getScrollToBottomButton() {
    return this.page.getByRole('button', { name: 'Scroll to bottom' });
  }

  getSidebar() {
    return this.page.getByTestId('chat-sidebar');
  }

  getHistoryList() {
    return this.page.getByTestId('sidebar-history-list');
  }

  async deleteChat(chatId: string) {
    const historyItem = this.page.getByTestId(`chat-history-item-${chatId}`);
    if (await historyItem.isVisible()) {
      await historyItem.hover();
    }
    const menuBtn = this.page.getByTestId(`chat-item-menu-${chatId}`);
    await menuBtn.click({ force: true });
    const deleteOption = this.page.getByTestId(`delete-chat-option-${chatId}`);
    await deleteOption.click();
    const confirmBtn = this.page.getByTestId('confirm-delete-chat');
    await confirmBtn.click();
  }

  async sendUserMessage(message: string) {
    await this.getInput().fill(message);
    await this.getSendButton().click();
  }
}
