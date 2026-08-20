import { expect, type Page } from '@playwright/test';

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

  getNewProjectButton() {
    return this.page.getByTestId('new-project-button');
  }

  getCreateFirstProjectButton() {
    return this.page.getByTestId('create-first-project-button');
  }

  getSearchProjectsInput() {
    return this.page.getByTestId('search-projects-input');
  }

  getProjectNameInput() {
    return this.page.getByTestId('project-name-input');
  }

  getSubmitCreateProjectButton() {
    return this.page.getByTestId('submit-create-project');
  }

  getEditProjectNameInput() {
    return this.page.getByTestId('edit-project-name-input');
  }

  getSubmitEditProjectButton() {
    return this.page.getByTestId('submit-edit-project');
  }

  getConfirmDeleteProjectButton() {
    return this.page.getByTestId('confirm-delete-project');
  }

  getProjectCard(projectId: string) {
    return this.page.getByTestId(`project-card-${projectId}`);
  }

  getProjectTitle(projectId: string) {
    return this.page.getByTestId(`project-title-${projectId}`);
  }

  async createProject(name: string) {
    const btn = (await this.getCreateFirstProjectButton().isVisible())
      ? this.getCreateFirstProjectButton()
      : this.getNewProjectButton();
    await btn.click();
    await this.getProjectNameInput().fill(name);
    await this.getSubmitCreateProjectButton().click();
    await expect(this.page.getByTestId('create-project-modal')).not.toBeVisible();
  }

  async renameProject(projectId: string, newName: string) {
    const actionsBtn = this.page.getByTestId(`project-actions-${projectId}`);
    await actionsBtn.click();
    const editOption = this.page.getByTestId(`edit-project-action-${projectId}`);
    await editOption.click();
    await this.getEditProjectNameInput().fill(newName);
    await this.getSubmitEditProjectButton().click();
    await expect(this.page.getByTestId('edit-project-modal')).not.toBeVisible();
  }

  async deleteProject(projectId: string) {
    const actionsBtn = this.page.getByTestId(`project-actions-${projectId}`);
    await actionsBtn.click();
    const deleteOption = this.page.getByTestId(`delete-project-action-${projectId}`);
    await deleteOption.click();
    await this.getConfirmDeleteProjectButton().click();
    await expect(this.page.getByTestId('delete-project-modal')).not.toBeVisible();
  }

  getSignInButton() {
    return this.page.getByRole('banner').getByRole('link', { name: 'Sign In' });
  }

  getSignUpButton() {
    return this.page.getByRole('banner').getByRole('link', { name: 'Sign Up' });
  }

  getPublicLandingTitle() {
    return this.page.getByRole('heading', { name: /Document-Grounded Active Learning/i });
  }
}
