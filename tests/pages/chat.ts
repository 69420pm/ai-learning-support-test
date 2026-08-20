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

  getViewportDropOverlay() {
    return this.page.getByTestId('viewport-drop-overlay');
  }

  getMaterialUploadDialog() {
    return this.page.getByTestId('material-upload-dialog');
  }

  getUploadDropZone() {
    return this.page.getByTestId('upload-drop-zone');
  }

  getUploadDialogFileInput() {
    return this.page.getByTestId('upload-dialog-file-input');
  }

  getStagedFileItem(index: number) {
    return this.page.getByTestId(`staged-file-item-${index}`);
  }

  getStartUploadButton() {
    return this.page.getByTestId('start-upload-button');
  }

  getCancelUploadButton() {
    return this.page.getByTestId('cancel-upload-button');
  }

  getMaterialPreviewDialog() {
    return this.page.getByTestId('material-preview-dialog');
  }

  getTabExtractedContent() {
    return this.page.getByTestId('tab-extracted-content');
  }

  getTabIndexedChunks() {
    return this.page.getByTestId('tab-indexed-chunks');
  }

  getExtractedContentView() {
    return this.page.getByTestId('extracted-content-view');
  }

  getIndexedChunksList() {
    return this.page.getByTestId('indexed-chunks-list');
  }

  getChunkCard(index: number) {
    return this.page.getByTestId(`chunk-card-${index}`);
  }

  getDeleteMaterialDialog() {
    return this.page.getByTestId('delete-material-dialog');
  }

  getConfirmDeleteMaterialButton() {
    return this.page.getByTestId('confirm-delete-material-button');
  }

  getCancelDeleteMaterialButton() {
    return this.page.getByTestId('cancel-delete-material-button');
  }

  async inspectMaterial(materialId: string) {
    const item = this.getMaterialItem(materialId);
    if (await item.isVisible()) {
      await item.hover();
    }
    const menuBtn = this.page.getByTestId(`material-menu-${materialId}`);
    await menuBtn.click({ force: true });
    const inspectOption = this.page.getByTestId(`inspect-material-option-${materialId}`);
    await inspectOption.click();
  }

  async deleteMaterial(materialId: string) {
    const item = this.getMaterialItem(materialId);
    if (await item.isVisible()) {
      await item.hover();
    }
    const menuBtn = this.page.getByTestId(`material-menu-${materialId}`);
    await menuBtn.click({ force: true });
    const deleteOption = this.page.getByTestId(`delete-material-option-${materialId}`);
    await deleteOption.click();
    const confirmBtn = this.getConfirmDeleteMaterialButton();
    await confirmBtn.click();
  }
}
