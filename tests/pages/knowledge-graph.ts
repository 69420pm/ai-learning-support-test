import type { Page } from '@playwright/test';

export class KnowledgeGraphPage {
  constructor(public page: Page) {}

  async goto(projectId: string): Promise<void> {
    await this.page.goto(`/projects/${projectId}/graph`);
  }

  getWorkbench() {
    return this.page.getByTestId('knowledge-graph-workbench');
  }

  getCanvas() {
    return this.page.getByTestId('graph-canvas');
  }

  getToolbar() {
    return this.page.getByTestId('graph-toolbar');
  }

  getEmptyState() {
    return this.page.getByTestId('graph-empty-state');
  }

  getUploadMaterialsLink() {
    return this.page.getByTestId('upload-materials-link');
  }

  getReadyState() {
    return this.page.getByTestId('graph-ready-state');
  }

  getGenerateButton() {
    return this.page.getByTestId('generate-graph-button');
  }

  getExtractingState() {
    return this.page.getByTestId('graph-extracting-state');
  }

  getSearchInput() {
    return this.page.getByTestId('graph-search-input');
  }

  getPacerFilter() {
    return this.page.getByTestId('graph-pacer-filter');
  }

  getMaterialFilter() {
    return this.page.getByTestId('graph-material-filter');
  }

  getLayoutToggle() {
    return this.page.getByTestId('graph-layout-toggle');
  }

  getLayoutForceButton() {
    return this.page.getByTestId('layout-force-btn');
  }

  getLayoutDagButton() {
    return this.page.getByTestId('layout-dag-btn');
  }

  getZoomInButton() {
    return this.page.getByTestId('graph-zoom-in');
  }

  getZoomOutButton() {
    return this.page.getByTestId('graph-zoom-out');
  }

  getFitViewButton() {
    return this.page.getByTestId('graph-fit-view');
  }

  getResyncButton() {
    return this.page.getByTestId('graph-resync-button');
  }

  getNode(kcId: string) {
    return this.page.getByTestId(`graph-node-${kcId}`);
  }

  getNodeName(kcId: string) {
    return this.page.getByTestId(`node-name-${kcId}`);
  }

  getEdge(edgeId: string) {
    return this.page.getByTestId(`graph-edge-${edgeId}`);
  }
}
