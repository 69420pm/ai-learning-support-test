import type { Page } from '@playwright/test';

export class ChatPage {
  constructor(public page: Page) {}

  async goto(projectId?: string) {
    if (projectId) {
      await this.page.goto(`/projects/${projectId}/chat`);
    } else {
      await this.page.goto('/chat');
    }
  }

  getBackToProjectsLink() {
    return this.page.getByTestId('back-to-projects-link');
  }

  getSidebarProjectName() {
    return this.page.getByTestId('sidebar-project-name');
  }

  getChatHeader() {
    return this.page.getByRole('banner');
  }

  getModelSelectorTrigger() {
    return this.page.getByTestId('model-selector-trigger');
  }

  getModelOption(modelId: string) {
    return this.page.getByTestId(`model-selector-item-${modelId}`);
  }

  async selectModel(modelId: string) {
    await this.getModelSelectorTrigger().click();
    await this.getModelOption(modelId).click();
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

  getMaterialList() {
    return this.page.getByTestId('material-list');
  }

  getUploadMaterialButton() {
    return this.page.getByTestId('upload-material-button');
  }

  getMaterialFileInput() {
    return this.page.getByTestId('material-file-input');
  }

  getMaterialItem(materialId: string) {
    return this.page.getByTestId(`material-item-${materialId}`);
  }
}
