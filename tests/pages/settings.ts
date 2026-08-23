import type { Page } from '@playwright/test';

export class SettingsPage {
  constructor(public page: Page) {}

  async goto() {
    await this.page.goto('/settings');
  }

  get heading() {
    return this.page.getByTestId('settings-heading');
  }

  get profileCard() {
    return this.page.getByTestId('profile-card');
  }

  get profileName() {
    return this.page.getByTestId('profile-name');
  }

  get profileEmail() {
    return this.page.getByTestId('profile-email');
  }

  get appearanceCard() {
    return this.page.getByTestId('appearance-card');
  }

  get systemThemeOption() {
    return this.page.getByTestId('theme-option-system');
  }

  get lightThemeOption() {
    return this.page.getByTestId('theme-option-light');
  }

  get darkThemeOption() {
    return this.page.getByTestId('theme-option-dark');
  }

  get activeThemeIndicator() {
    return this.page.getByTestId(/theme-indicator-.*/);
  }

  getThemeIndicator(theme: 'system' | 'light' | 'dark') {
    return this.page.getByTestId(`theme-indicator-${theme}`);
  }

  async selectTheme(theme: 'system' | 'light' | 'dark') {
    const option = this.page.getByTestId(`theme-option-${theme}`);
    await option.click();
  }
}
