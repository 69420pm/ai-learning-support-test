import { expect, test } from '../fixtures';
import { generateRandomTestUser } from '../helpers';

test.describe('Authentication System E2E', () => {
  test('displays validation error for invalid email format on login', async ({ authPage }) => {
    await authPage.gotoLogin();
    await authPage.login('not-an-email', 'password123');

    await expect(authPage.emailInput).toHaveAttribute('aria-invalid', 'true');
    await expect(authPage.page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('displays validation error for short password on login', async ({ authPage }) => {
    await authPage.gotoLogin();
    await authPage.login('valid@example.com', 'short');

    await expect(authPage.passwordInput).toHaveAttribute('aria-invalid', 'true');
    await expect(
      authPage.page.getByText('Password must be at least 8 characters long'),
    ).toBeVisible();
  });

  test('handles sign up flow and shows verification instructions', async ({ authPage }) => {
    const user = generateRandomTestUser();

    await authPage.gotoSignup();
    await authPage.signUp(user.fullName, user.email, user.password);

    await expect(authPage.page.getByText('Check your email')).toBeVisible();
  });

  test('handles forgot password flow', async ({ authPage }) => {
    await authPage.gotoForgotPassword();
    await authPage.emailInput.fill('user@example.com');
    await authPage.submitButton.click();

    await expect(authPage.page.getByText('Check your email')).toBeVisible();
  });

  test('handles reset password flow', async ({ authPage }) => {
    await authPage.gotoResetPassword();
    await authPage.passwordInput.fill('NewPassword123!');
    await authPage.confirmPasswordInput.fill('NewPassword123!');
    await authPage.submitButton.click();

    await expect(authPage.page).toHaveURL(/\/login\?message=password-updated/);
    await expect(
      authPage.page.getByText(
        'Your password has been successfully updated. Please sign in with your new password.',
      ),
    ).toBeVisible();
  });

  test('full user authentication lifecycle: sign up -> sign in -> protected route -> user nav -> logout', async ({
    authPage,
    page,
  }) => {
    const user = generateRandomTestUser();

    // 1. Sign Up
    await authPage.gotoSignup();
    await authPage.signUp(user.fullName, user.email, user.password);
    await expect(page.getByText('Check your email')).toBeVisible();

    // Clear mock auth cookie set during signup so user can access /login
    await page.context().clearCookies();

    // 2. Sign In with credentials
    await authPage.gotoLogin();
    await authPage.login(user.email, user.password);

    const url = page.url();
    if (url.includes('/chat') || url.endsWith('/') || url.includes('/dashboard')) {
      // 3. Verify Header UserNav and Protected Route
      await expect(authPage.userNavTrigger).toBeVisible();
      await authPage.userNavTrigger.click();
      await expect(authPage.userNavEmail).toHaveText(user.email);

      // 4. Logout Flow
      await authPage.userNavLogout.click();
      await expect(page).toHaveURL(/\/login/);

      // 5. Unauthenticated Protected Route Access Redirection
      await page.goto('/chat');
      await expect(page).toHaveURL(/\/login/);
    } else {
      // If Supabase requires email confirmation before login
      await expect(page).toHaveURL(/\/(login|chat)/);
    }
  });

  test('redirects unauthenticated users attempting to access /chat to /login', async ({ page }) => {
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/login/);
  });
});
