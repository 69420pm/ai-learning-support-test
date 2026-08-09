import type { Page } from '@playwright/test';

export class AuthPage {
  constructor(public page: Page) {}

  // Locators
  get emailInput() {
    return this.page.getByTestId('auth-email-input');
  }

  get passwordInput() {
    return this.page.getByTestId('auth-password-input');
  }

  get fullNameInput() {
    return this.page.getByTestId('auth-fullname-input');
  }

  get confirmPasswordInput() {
    return this.page.getByTestId('auth-confirmpassword-input');
  }

  get submitButton() {
    return this.page.getByTestId('auth-submit-button');
  }

  get userNavTrigger() {
    return this.page.getByTestId('user-nav-trigger');
  }

  get userNavEmail() {
    return this.page.getByTestId('user-nav-email');
  }

  get userNavLogout() {
    return this.page.getByTestId('user-nav-logout');
  }

  // Navigation helpers
  async gotoLogin() {
    await this.page.goto('/login');
  }

  async gotoSignup() {
    await this.page.goto('/signup');
  }

  async gotoForgotPassword() {
    await this.page.goto('/forgot-password');
  }

  async gotoResetPassword() {
    await this.page.goto('/reset-password');
  }

  // Action helpers
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async signUp(fullName: string, email: string, password: string, confirmPassword?: string) {
    await this.fullNameInput.fill(fullName);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword ?? password);
    await this.submitButton.click();
  }

  async logout() {
    await this.userNavTrigger.click();
    await this.userNavLogout.click();
  }
}
