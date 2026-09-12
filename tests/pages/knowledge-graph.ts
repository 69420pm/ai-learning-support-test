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

  // Diagnostics Bar
  getDiagnosticsBar() {
    return this.page.getByTestId('graph-diagnostics-bar');
  }

  getDiagnosticsNodes() {
    return this.page.getByTestId('diagnostics-nodes');
  }

  getDiagnosticsEdges() {
    return this.page.getByTestId('diagnostics-edges');
  }

  getDiagnosticsOrphans() {
    return this.page.getByTestId('diagnostics-orphans');
  }

  getDiagnosticsCycleStatus() {
    return this.page.getByTestId('diagnostics-cycle-status');
  }

  // Inspector Drawer
  getInspectorDrawer() {
    return this.page.getByTestId('concept-inspector-drawer');
  }

  getInspectorCloseButton() {
    return this.page.getByTestId('concept-inspector-close');
  }

  getInspectorTitle() {
    return this.page.getByTestId('inspector-concept-title');
  }

  getInspectorPacerBadge() {
    return this.page.getByTestId('inspector-pacer-badge');
  }

  getInspectorBloomBadge() {
    return this.page.getByTestId('inspector-bloom-badge');
  }

  getTabTrigger(tab: 'overview' | 'dependencies' | 'exercises' | 'source' | 'debug') {
    return this.page.getByTestId(`tab-trigger-${tab}`);
  }

  getTabContent(tab: 'overview' | 'dependencies' | 'exercises' | 'source' | 'debug') {
    return this.page.getByTestId(`tab-content-${tab}`);
  }

  getConceptSlug() {
    return this.page.getByTestId('concept-slug');
  }

  getConceptAliases() {
    return this.page.getByTestId('concept-aliases');
  }

  getDirectPrerequisitesList() {
    return this.page.getByTestId('direct-prerequisites-list');
  }

  getUnlockedConceptsList() {
    return this.page.getByTestId('unlocked-concepts-list');
  }

  getDependencyReasoning() {
    return this.page.getByTestId('dependency-reasoning');
  }

  getGroundedExercisesList() {
    return this.page.getByTestId('grounded-exercises-list');
  }

  getExerciseType() {
    return this.page.getByTestId('exercise-type');
  }

  getExerciseDifficulty() {
    return this.page.getByTestId('exercise-difficulty');
  }

  getExercisePage() {
    return this.page.getByTestId('exercise-page');
  }

  getExercisePrompt() {
    return this.page.getByTestId('exercise-prompt');
  }

  getExerciseSolution() {
    return this.page.getByTestId('exercise-solution');
  }

  getSourceMaterialName() {
    return this.page.getByTestId('source-material-name');
  }

  getSourceMaterialLink() {
    return this.page.getByTestId('source-material-link');
  }

  getSourceChunksList() {
    return this.page.getByTestId('source-chunks-list');
  }

  getEmbeddingDiagnostics() {
    return this.page.getByTestId('embedding-diagnostics');
  }

  getRawJsonPayload() {
    return this.page.getByTestId('raw-json-payload');
  }

  getCopyJsonButton() {
    return this.page.getByTestId('copy-json-button');
  }

  getCopyJsonSuccess() {
    return this.page.getByTestId('copy-json-success');
  }
}
