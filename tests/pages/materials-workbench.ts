import type { Page } from '@playwright/test';

export class MaterialsWorkbenchPage {
  constructor(public page: Page) {}

  async goto(projectId: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}/materials`);
  }

  getWorkbench() {
    return this.page.getByTestId('material-workbench');
  }

  getWorkbenchHeading() {
    return this.page.getByRole('heading', { name: 'Materials Workbench' });
  }

  getSearchInput() {
    return this.page.getByTestId('workbench-search-input');
  }

  getStatusFilter() {
    return this.page.getByTestId('workbench-status-filter');
  }

  getSortSelect() {
    return this.page.getByTestId('workbench-sort-select');
  }

  getUploadButton() {
    return this.page.getByTestId('workbench-upload-button');
  }

  getSyncGraphButton() {
    return this.page.getByTestId('workbench-sync-graph-button');
  }

  getDropzone() {
    return this.page.getByTestId('workbench-dropzone');
  }

  getFileInput() {
    return this.page.getByTestId('workbench-file-input');
  }

  getUploadQueue() {
    return this.page.getByTestId('workbench-upload-queue');
  }

  getRow(materialId: string) {
    return this.page.getByTestId(`workbench-row-${materialId}`);
  }

  getIngestionStage(materialId: string) {
    return this.page.getByTestId(`ingestion-stage-${materialId}`);
  }

  getInspectButton(materialId: string) {
    return this.page.getByTestId(`inspect-material-btn-${materialId}`);
  }

  getExtractButton(materialId: string) {
    return this.page.getByTestId(`extract-concepts-btn-${materialId}`);
  }

  getDeleteButton(materialId: string) {
    return this.page.getByTestId(`delete-material-btn-${materialId}`);
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

  getDeleteMaterialDialog() {
    return this.page.getByTestId('delete-material-dialog');
  }

  getConfirmDeleteButton() {
    return this.page.getByTestId('confirm-delete-material-button');
  }
}
